const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

// Lazily create the transporter once, on first use, rather than at import
// time — this way a missing EMAIL_USER/EMAIL_PASS doesn't crash the whole
// server on startup, it just means emails silently won't send (logged below).
function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Render's network has intermittent/broken outbound IPv6 support.
    // dns.setDefaultResultOrder('ipv4first') in server.js reduces this,
    // but doesn't fully eliminate it (confirmed: some requests still hit
    // ENETUNREACH on an IPv6 address for smtp.gmail.com even with that
    // set). Forcing `family: 4` here makes the SMTP socket itself refuse
    // to even attempt an IPv6 connection, which is a hard guarantee
    // rather than just a DNS-ordering preference.
    family: 4,
  });

  return transporter;
}

// User-submitted text is going into an HTML email body, so it needs to be
// escaped — otherwise someone could submit a "message" containing HTML/JS
// and have it render inside the email itself instead of showing as plain text.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sends a notification email to the site owner when a new contact form
 * submission comes in. Failures here are logged but never thrown — a
 * broken email setup should never cause the contact form submission
 * itself to fail, since the data is already safely saved in MongoDB
 * regardless.
 */
async function sendContactNotification(contact) {
  const t = getTransporter();

  if (!t) {
    logger.warn('Notification email not sent — EMAIL_USER/EMAIL_PASS not set in .env');
    return;
  }

  const notifyTo = process.env.NOTIFY_EMAIL || process.env.EMAIL_USER;
  const safeName = escapeHtml(contact.name);
  const safeEmail = escapeHtml(contact.email);
  const safeSubject = escapeHtml(contact.subject || '(none)');
  const safeMessage = escapeHtml(contact.message).replace(/\n/g, '<br>');

  try {
    await t.sendMail({
      from: `"Virtualenvi Website" <${process.env.EMAIL_USER}>`,
      to: notifyTo,
      replyTo: contact.email,
      subject: `New contact form submission: ${contact.subject || '(no subject)'}`,
      text: [
        `Name: ${contact.name}`,
        `Email: ${contact.email}`,
        `Subject: ${contact.subject || '(none)'}`,
        '',
        'Message:',
        contact.message,
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #1A1A2E;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <p><strong>Message:</strong></p>
          <p style="background: #f4f4f4; padding: 12px; border-radius: 6px;">${safeMessage}</p>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">Reply directly to this email to respond to ${safeName}.</p>
        </div>
      `,
    });
    logger.info(`Notification email sent for submission ${contact._id}`);
  } catch (err) {
    // Log and swallow — the form submission already succeeded and was
    // saved to the database, so a failed email shouldn't surface as an
    // error to the person who submitted the form.
    logger.error('Failed to send notification email', err);
  }
}

/**
 * Sends a confirmation email back to the person who submitted the form,
 * letting them know their message was received. Same fire-and-forget
 * failure handling as the notification email — this is a nice-to-have,
 * not something that should ever block or fail the actual submission.
 */
async function sendConfirmationEmail(contact) {
  const t = getTransporter();

  if (!t) {
    logger.warn('Confirmation email not sent — EMAIL_USER/EMAIL_PASS not set in .env');
    return;
  }

  const safeName = escapeHtml(contact.name);

  try {
    await t.sendMail({
      from: `"Virtualenvi" <${process.env.EMAIL_USER}>`,
      to: contact.email,
      subject: 'We received your message — Virtualenvi',
      text: `Hi ${contact.name},\n\nThanks for reaching out to Virtualenvi. We've received your message and will get back to you soon.\n\n— The Virtualenvi Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #1A1A2E;">Thanks for reaching out, ${safeName}!</h2>
          <p>We've received your message and someone from our team will get back to you soon.</p>
          <p style="color: #888; font-size: 13px; margin-top: 24px;">— The Virtualenvi Team</p>
        </div>
      `,
    });
    logger.info(`Confirmation email sent to ${contact.email} for submission ${contact._id}`);
  } catch (err) {
    logger.error('Failed to send confirmation email', err);
  }
}

module.exports = { sendContactNotification, sendConfirmationEmail };
