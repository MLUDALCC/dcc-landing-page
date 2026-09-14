// Creates a Stripe Checkout Session for a donation started from the
// custom "Give Online" form on the DCC website (give.html and
// ways-to-give.html). The form only ever sends this endpoint a dollar
// amount, an optional tribute name, and two yes/no flags -- Stripe's own
// Checkout page (which this redirects to) handles every part of actually
// collecting and processing the card. This function never sees, stores,
// or handles card details itself.
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
// if it differs, so the "cover the fee" amount stays accurate.

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

  // Prefer the browser's own Origin header for the redirect URLs (so this
  // works correctly on whatever domain it's actually deployed to) and
  // fall back to an optional SITE_URL app setting. If neither is present,
  // fail loudly rather than guessing a domain and silently sending donors
  // to the wrong place after paying.
  const origin = req.headers.origin || process.env.SITE_URL;
  if (!origin) {
    context.log.error("No Origin header and no SITE_URL app setting configured.");
    context.res.status = 500;
    context.res.body = { error: "Something went wrong starting checkout. Please try again or contact us." };
    return;
  }

  try {
    const stripe = Stripe(stripeSecretKey);

    const productName = "Donation to the Dallas Children's Chorus";
    const productDescription = tribute ? `In honor/memory of: ${tribute}` : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
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
      success_url: `${origin}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/give.html`,
    });

    context.res.status = 200;
    context.res.body = { url: session.url };
  } catch (err) {
    context.log.error("Error creating Stripe Checkout Session:", err);
    context.res.status = 500;
    context.res.body = { error: "Something went wrong starting checkout. Please try again, or use “Give another way” to give directly through Stripe." };
  }
};
