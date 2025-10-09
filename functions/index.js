// functions/index.js
const functions = require("firebase-functions");
const sgMail = require("@sendgrid/mail");

exports.sendMail = functions.v1
  .region("australia-southeast1") // Gen1 也支持这个区域
  .https.onCall(async (data, context) => {
    // 需要已登录
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Login required.");
    }

    const apiKey = functions.config().sendgrid.key; // ← 使用 functions:config
    if (!apiKey) {
      throw new functions.https.HttpsError("failed-precondition", "SendGrid key not configured");
    }
    sgMail.setApiKey(apiKey);

    const { to, subject, html, cc, bcc, attachments = [] } = data || {};
    if (!to || !subject || !html) {
      throw new functions.https.HttpsError("invalid-argument", "Missing to/subject/html");
    }

    const msg = {
      to,
      from: { email: "no-reply@your-domain.example", name: "Campus Event System" },
      subject,
      html,
      cc,
      bcc,
      attachments: attachments.map(a => ({
        filename: a.filename,
        content: a.content,  // base64
        type: a.type || "application/octet-stream",
        disposition: "attachment",
      })),
    };

    try {
      await sgMail.send(msg);
      return { ok: true };
    } catch (err) {
      console.error("SendGrid error", (err.response && err.response.body) || err.message);

      throw new functions.https.HttpsError("internal", "Email failed to send");
    }
  });
