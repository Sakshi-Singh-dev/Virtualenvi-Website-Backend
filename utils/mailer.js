const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const logger = require('./logger');

let transporter = null;
let resolvedIPv4Host = null;

// Every previous attempt to fix the ENETUNREACH/timeout issue relied on
// Node choosing the right address itself (DNS ordering, disabling
// dual-stack racing) — and Render's environment kept ignoring those
// settings for reasons that were hard to pin down. This is the definitive
// fix: we resolve smtp.gmail.com's actual IPv4 address ourselves using
// dns.resolve4() (which can ONLY return IPv4 addresses — there is no
// IPv6 to accidentally pick), then connect directly to that literal IP.
// A literal IP has no DNS lookup step at connection time, so there is
// nothing left for Node to get wrong.
async function getGmailIPv4Host() {
  if (resolvedIPv4Host) return resolvedIPv4Host;

  try {
    const addresses = await dns.resolve4('smtp.gmail.com');
    resolvedIPv4Host = addresses[0];
    logger.info(`Resolved smtp.gmail.com to IPv4 address ${resolvedIPv4Host}`);
    return resolvedIPv4Host;
  } catch (err) {
    logger.warn('Could not resolve smtp.gmail.com to an IPv4 address, falling back to hostname');
    return null;
  }
}

async function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  const ipv4Host = await getGmailIPv4Host();

  if (ipv4Host) {
    // Connect to the literal resolved IP. `servername` is required so TLS
    // certificate validation still checks against "smtp.gmail.com" (the
    // name on Gmail's certificate) instead of the raw IP, which would
    // otherwise fail certificate hostname verification.
    transporter = nodemailer.createTransport({
      host: ipv4Host,
      port: 465,
      secure: true,
      tls: { servername: 'smtp.gmail.com' },
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // Fallback: if we couldn't resolve an IPv4 address for some reason,
    // fall back to the normal hostname-based config rather than not
    // sending email at all.
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

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

async function sendContactNotification(contact) {
  const t = await getTransporter();

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
    logger.error('Failed to send notification email', err);
  }
}

async function sendConfirmationEmail(contact) {
  const t = await getTransporter();

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
