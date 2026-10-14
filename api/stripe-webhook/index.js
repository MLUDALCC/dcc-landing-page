// Stripe webhook: when a donation succeeds, email the donor a thank-you
// through Resend. Stripe's own receipt email is separate and unchanged.
//
// App settings required (Azure Portal > Static Web App > Configuration):
//   STRIPE_SECRET_KEY      (already set for the giving form)
//   STRIPE_WEBHOOK_SECRET  signing secret ("whsec_...") of the webhook endpoint
//                          created in Stripe Dashboard > Developers > Webhooks
//   RESEND_API_KEY         Resend API key with sending permission
// Optional:
//   THANKYOU_FROM          default: Dallas Children's Chorus <chorus@mail.dalcc.org>
//   THANKYOU_REPLY_TO      default: chorus@dalcc.org
// Never commit any of these values to the repo.
//
// Stripe retries a webhook until it gets a 2xx, so the Resend call carries an
// Idempotency-Key (the PaymentIntent id): a retry can never send twice.

const Stripe = require("stripe");
const { buildThankYou } = require("./thankyou");

const DEFAULT_FROM = "Dallas Children's Chorus <chorus@mail.dalcc.org>";
const DEFAULT_REPLY_TO = "chorus@dalcc.org";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function (context, req) {
  context.res = { headers: { "Content-Type": "application/json" } };

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const resendKey = process.env.RESEND_API_KEY;
  if (!secretKey || !webhookSecret || !resendKey) {
    context.log.error("stripe-webhook is missing STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET or RESEND_API_KEY.");
    context.res.status = 500;
    context.res.body = { error: "Not configured." };
    return;
  }

  const stripe = Stripe(secretKey);

  // Signature check needs the exact raw bytes Stripe sent.
  let event;
  try {
    const raw = typeof req.rawBody === "string" ? req.rawBody : JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(raw, req.headers["stripe-signature"], webhookSecret);
  } catch (err) {
    context.log.error("Stripe webhook signature check failed: " + err.message);
    context.res.status = 400;
    context.res.body = { error: "Invalid signature." };
    return;
  }

  if (event.type !== "payment_intent.succeeded") {
    context.res.status = 200;
    context.res.body = { ignored: event.type };
    return;
  }

  try {
    const pi = event.data.object;

    // Donor's name/email were passed to Stripe as billing details and
    // receipt_email by the giving form.
    let name = "";
    let email = pi.receipt_email || "";
    if (pi.latest_charge) {
      const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
      const charge = await stripe.charges.retrieve(chargeId);
      name = (charge.billing_details && charge.billing_details.name) || "";
      email = email || (charge.billing_details && charge.billing_details.email) || "";
    }

    if (!EMAIL_PATTERN.test(email)) {
      context.log.warn("No usable donor email on PaymentIntent " + pi.id + "; no thank-you sent.");
      context.res.status = 200;
      context.res.body = { skipped: "no email" };
      return;
    }

    const message = buildThankYou({
      name: name,
      amountCents: pi.amount_received || pi.amount,
      tribute: pi.metadata && pi.metadata.tribute_name,
    });

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + resendKey,
        "Content-Type": "application/json",
        "Idempotency-Key": "thankyou-" + pi.id,
      },
      body: JSON.stringify({
        from: process.env.THANKYOU_FROM || DEFAULT_FROM,
        to: [email],
        reply_to: process.env.THANKYOU_REPLY_TO || DEFAULT_REPLY_TO,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      context.log.error("Resend responded " + resp.status + ": " + t.slice(0, 300));
      context.res.status = 500; // make Stripe retry
      context.res.body = { error: "Email send failed." };
      return;
    }

    context.res.status = 200;
    context.res.body = { sent: true };
  } catch (err) {
    context.log.error("Error sending thank-you email:", err);
    context.res.status = 500;
    context.res.body = { error: "Error." };
  }
};
