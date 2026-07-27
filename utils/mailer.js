const logger = require('./logger');

const RESEND_API_URL = 'https://api.resend.com/emails';

async function sendViaResend({ to, subject, html, text, replyTo }) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('Email not sent — RESEND_API_KEY not set in .env');
    return null;
  }

  const body = {

    from: 'Virtualenvi Website <onboarding@resend.dev>',
    to,
    subject,
    html,
    text,
  };
  if (replyTo) body.reply_to = replyTo;

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorBody}`);
  }

  return response.json();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


async function sendContactNotification(contact) {
  const notifyTo = process.env.NOTIFY_EMAIL || process.env.EMAIL_USER;
  const safeName = escapeHtml(contact.name);
  const safeEmail = escapeHtml(contact.email);
  const safeSubject = escapeHtml(contact.subject || '(none)');
  const safeMessage = escapeHtml(contact.message).replace(/\n/g, '<br>');

  try {
    const result = await sendViaResend({
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
    if (result) {
      logger.info(`Notification email sent for submission ${contact._id}`);
    }
  } catch (err) {
    logger.error('Failed to send notification email', err);
  }
}


async function sendConfirmationEmail(contact) {
  const safeName = escapeHtml(contact.name);

  try {
    const result = await sendViaResend({
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
    if (result) {
      logger.info(`Confirmation email sent to ${contact.email} for submission ${contact._id}`);
    }
  } catch (err) {
    logger.error('Failed to send confirmation email (expected for non-account-owner addresses on Resend free tier)', err);
  }
}

module.exports = { sendContactNotification, sendConfirmationEmail };
