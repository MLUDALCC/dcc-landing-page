// Creates a Stripe PaymentIntent for a donation started from the custom
// "Give Online" form on the DCC website (give.html and ways-to-give.html).
// Unlike the older Checkout Session approach, this keeps the donor on the
// DCC's own page the whole time: the front end mounts Stripe's "Payment
// Element" directly in our form (styled to match the site) and confirms
// the payment in place, including Apple Pay / Google Pay when available.
// This function only ever creates the PaymentIntent -- it never sees or
// handles card details itself; that stays entirely inside Stripe's own
// embedded fields and Stripe.js.
//
// Requires an app setting named STRIPE_SECRET_KEY in the Static Web App's
// configuration (Azure Portal > your Static Web App > Configuration).
// Never commit a real Stripe secret key into this repo.
//
// NOTE ON THE FEE-COVER MATH: Stripe's standard US card rate has
// historically been 2.9% + $0.30 per transaction, but this can vary by
// card type and by whatever rate Stripe has you on (nonprofit accounts
// sometimes get a discounted rate) -- double-check your own Stripe
// dashboard's current rate and adjust FEE_PERCENT/FEE_FIXED_CENTS below
// (kept in sync with update-payment-intent/index.js) if it differs, so
// the "cover the fee" amount stays accurate.

const Stripe = require("stripe");

const MIN_AMOUNT_CENTS = 500; // $5 minimum -- keeps test/junk submissions out and matches the UI's stated minimum
const MAX_AMOUNT_CENTS = 2500000; // $25,000 sanity ceiling -- guards against a typo becoming a runaway charge attempt; larger gifts should go through Ways to Give's other methods
const FEE_PERCENT = 0.03; // see NOTE above -- verify against your actual Stripe rate
const FEE_FIXED_CENTS = 30;

function computeFeeCoveredTotalCents(baseCents) {
  // Solve for a total T such that, after Stripe deducts its cut from T,
  // the DCC still nets the donor's originally intended amount:
  //   T * (1 - FEE_PERCENT) - FEE_FIXED_CENTS = baseCents
  return Math.round((baseCents + FEE_FIXED_CENTS) / (1 - FEE_PERCENT));
}

module.exports = async function (context, req) {
  context.res = { headers: { "Content-Type": "application/json" } };

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    context.log.error("STRIPE_SECRET_KEY is not configured in this Static Web App's settings.");
    context.res.status = 500;
    context.res.body = { error: "Online giving isn't fully set up yet. Please try again later or contact us directly." };
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};

  const amountDollars = Number(body.amount);
  const tribute = typeof body.tribute === "string" ? body.tribute.trim().slice(0, 200) : "";
  const anonymous = body.anonymous === true;
  const coverFee = body.coverFee === true;

  if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
    context.res.status = 400;
    context.res.body = { error: "Please enter a valid donation amount." };
    return;
  }

  let amountCents = Math.round(amountDollars * 100);
  if (coverFee) {
    amountCents = computeFeeCoveredTotalCents(amountCents);
  }

  if (amountCents < MIN_AMOUNT_CENTS) {
    context.res.status = 400;
    context.res.body = { error: "The minimum online gift is $5." };
    return;
  }
  if (amountCents > MAX_AMOUNT_CENTS) {
    context.res.status = 400;
    context.res.body = { error: "That amount is larger than we can process online. Please see Ways to Give for other options, or contact us directly." };
    return;
  }

  try {
    const stripe = Stripe(stripeSecretKey);

    const description = tribute
      ? `Donation to the Dallas Children's Chorus -- in honor/memory of: ${tribute}`
      : "Donation to the Dallas Children's Chorus";

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      // Lets Stripe automatically offer whichever payment methods are both
      // enabled in the Dashboard and supported for this amount/currency/
      // browser -- cards plus Apple Pay / Google Pay wherever available --
      // without us having to list them out here.
      automatic_payment_methods: { enabled: true },
      description: description,
      // Not sent to the donor or shown on Stripe's page -- this is just
      // for your own Stripe Dashboard records, so staff processing gifts
      // can see the tribute name and whether the donor asked to stay
      // private from public donor recognition or opted to cover fees.
      metadata: {
        tribute_name: tribute || "(none)",
        anonymous_gift: anonymous ? "yes" : "no",
        fee_covered: coverFee ? "yes" : "no",
        intended_amount_cents: String(Math.round(amountDollars * 100)),
      },
    });

    context.res.status = 200;
    context.res.body = { clientSecret: intent.client_secret, paymentIntentId: intent.id };
  } catch (err) {
    context.log.error("Error creating Stripe PaymentIntent:", err);
    context.res.status = 500;
    context.res.body = { error: "Something went wrong setting up the payment. Please try again, or use “Give another way” to give directly through Stripe." };
  }
};
