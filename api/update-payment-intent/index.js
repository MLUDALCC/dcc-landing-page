// Updates an in-progress Stripe PaymentIntent when the donor changes their
// amount, tribute name, or checkbox choices *after* the embedded payment
// fields have already been created on the page. This lets the on-page
// Payment Element (and any Apple Pay / Google Pay button it shows) reflect
// the correct live amount without having to tear down and recreate the
// whole payment form. Like create-payment-intent, this never touches card
// details -- it only ever adjusts the amount/metadata Stripe already has
// on file for this PaymentIntent.
//
// Requires the same STRIPE_SECRET_KEY app setting as create-payment-intent.

const Stripe = require("stripe");

const MIN_AMOUNT_CENTS = 500;
const MAX_AMOUNT_CENTS = 2500000;
const FEE_PERCENT = 0.022; // DCC's Stripe nonprofit rate for Visa/Mastercard -- keep in sync with create-payment-intent/index.js (see the NOTE there on why Amex is deliberately undercollected)
const FEE_FIXED_CENTS = 30; // Visa/Mastercard's $0.30 fixed per-transaction fee

function computeFeeCoveredTotalCents(baseCents) {
  return Math.round((baseCents + FEE_FIXED_CENTS) / (1 - FEE_PERCENT));
}

// A Stripe PaymentIntent id always starts with "pi_" -- this is just a
// sanity check before we hand a client-supplied string to the Stripe API,
// not a security boundary (the Stripe API itself is the real authority on
// whether an id is valid and belongs to this account).
const PAYMENT_INTENT_ID_PATTERN = /^pi_[A-Za-z0-9_]+$/;

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

  const paymentIntentId = typeof body.paymentIntentId === "string" ? body.paymentIntentId : "";
  const amountDollars = Number(body.amount);
  const tribute = typeof body.tribute === "string" ? body.tribute.trim().slice(0, 200) : "";
  const anonymous = body.anonymous === true;
  const coverFee = body.coverFee === true;

  if (!PAYMENT_INTENT_ID_PATTERN.test(paymentIntentId)) {
    context.res.status = 400;
    context.res.body = { error: "Missing or invalid payment reference. Please refresh and try again." };
    return;
  }

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

    const intent = await stripe.paymentIntents.update(paymentIntentId, {
      amount: amountCents,
      description: description,
      metadata: {
        tribute_name: tribute || "(none)",
        anonymous_gift: anonymous ? "yes" : "no",
        fee_covered: coverFee ? "yes" : "no",
        intended_amount_cents: String(Math.round(amountDollars * 100)),
      },
    });

    context.res.status = 200;
    context.res.body = { amount: intent.amount };
  } catch (err) {
    // A PaymentIntent can no longer be updated once it's already
    // succeeded or is mid-processing (e.g. the donor already submitted
    // while this update was in flight) -- Stripe surfaces that as a
    // normal API error here, not a crash, so just report it plainly
    // rather than treating it as unexpected.
    context.log.error("Error updating Stripe PaymentIntent:", err);
    context.res.status = 409;
    context.res.body = { error: "This payment could not be updated -- please refresh the page and try again." };
  }
};
