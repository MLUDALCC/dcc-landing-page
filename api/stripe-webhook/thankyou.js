// Builds the donor thank-you email (subject, plain text, HTML). Pure
// functions, no network, so the wording is easy to review and test.
// The tax receipt itself is the separate email Stripe sends; this message
// is a warm thank-you and deliberately makes no tax claims.

// Hosted on the website (assets/img/email-header.png); deploys from main.
const LOGO_URL = "https://www.dalcc.org/assets/img/email-header.png";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function firstName(fullName) {
  const n = typeof fullName === "string" ? fullName.trim() : "";
  if (!n) return "";
  return n.split(/\s+/)[0].slice(0, 40);
}

function formatAmount(cents) {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 });
}

// opts: { name, amountCents, tribute }
function buildThankYou(opts) {
  const first = firstName(opts.name);
  const amount = formatAmount(opts.amountCents);
  const tribute = typeof opts.tribute === "string" ? opts.tribute.trim() : "";
  const hasTribute = tribute && tribute !== "(none)";

  const greeting = first ? `Dear ${first},` : "Dear friend,";
  const lines = [
    greeting,
    `Thank you for your generous gift of ${amount} to the Dallas Children's Chorus. Because of supporters like you, young singers across Dallas-Fort Worth get choral training, performance opportunities, and a community that helps them grow.`,
  ];
  if (hasTribute) lines.push(`We have noted that your gift is made in honor/memory of ${tribute}. What a thoughtful way to remember them.`);
  lines.push("Your receipt for tax purposes comes in a separate email from Stripe, our payment processor. If you don't see it in a few minutes, please check your spam folder or write to us at chorus@dalcc.org.");
  lines.push("With gratitude,");
  const signoff = "The Dallas Children's Chorus";

  const text = lines.join("\n\n") + "\n" + signoff + "\nhttps://www.dalcc.org\n";

  const NAVY = "#0b2a4a";
  const p = (t) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1b2a41;">${escapeHtml(t)}</p>`;
  // Table layout + inline styles for email-client compatibility. The header
  // image has the navy band baked in, so it reads the same in dark mode; the
  // navy background on its cell shows (with the alt text) if images are blocked.
  const html =
    `<!doctype html><html><body style="margin:0;padding:0;background:#f3f5f8;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f8;"><tr><td align="center" style="padding:24px 12px;">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden;">` +
    `<tr><td bgcolor="${NAVY}" style="background:${NAVY};text-align:center;">` +
    `<a href="https://www.dalcc.org"><img src="${LOGO_URL}" width="600" alt="Dallas Children's Chorus" style="display:block;width:100%;max-width:600px;height:auto;border:0;color:#ffffff;font-family:Georgia,serif;font-size:20px;line-height:60px;"></a>` +
    `</td></tr>` +
    `<tr><td style="padding:32px 36px 12px;font-family:Georgia,'Times New Roman',serif;">` +
    lines.map(p).join("") +
    `<p style="margin:0 0 8px;font-size:16px;line-height:1.6;color:#1b2a41;">${escapeHtml(signoff)}</p>` +
    `</td></tr>` +
    `<tr><td style="padding:16px 36px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6b7686;border-top:1px solid #e3e7ee;">` +
    `Dallas Children's Chorus &middot; <a href="https://www.dalcc.org" style="color:#6b7686;">www.dalcc.org</a> &middot; <a href="mailto:chorus@dalcc.org" style="color:#6b7686;">chorus@dalcc.org</a>` +
    `</td></tr></table></td></tr></table></body></html>`;

  return { subject: "Thank you for your gift to the Dallas Children's Chorus", text, html };
}

module.exports = { buildThankYou, formatAmount, firstName };
