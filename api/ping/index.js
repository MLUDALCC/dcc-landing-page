// Temporary diagnostic endpoint -- deliberately has NO dependencies (no
// require("stripe"), nothing) so we can tell whether the whole Functions
// host is failing to start vs. something specific to the Stripe-using
// functions. Safe to delete once the create-payment-intent 500 is fixed.
module.exports = async function (context, req) {
  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: { ok: true, message: "pong" }
  };
};
