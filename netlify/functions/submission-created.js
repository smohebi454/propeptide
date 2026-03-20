/**
 * submission-created — Netlify Background Function
 *
 * Auto-triggered by Netlify when any form submission is created.
 * Sends email notifications to both owners via Resend.
 *
 * Handles two forms:
 *   - "contact"   → general enquiry notification
 *   - "wholesale"  → wholesale/B2B enquiry notification
 *
 * Environment variables (Netlify UI → Site → Environment):
 *   RESEND_API_KEY — Resend API key
 */

var NOTIFY_EMAILS = [
  'suhailmohebi@gmail.com',
  'owaismohebi@gmail.com'
];

exports.handler = async function (event) {
  // Reject direct HTTP traffic
  if (event.httpMethod === 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  var payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad request' }) };
  }

  // Netlify event payloads always have payload.payload
  if (!payload.payload) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  var formName = payload.payload.form_name;
  var data = payload.payload.data || {};

  // Only process known forms
  if (formName !== 'contact' && formName !== 'wholesale') {
    return { statusCode: 200, body: JSON.stringify({ status: 'skipped', reason: 'unknown form: ' + formName }) };
  }

  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('submission-created: RESEND_API_KEY not set — skipping email');
    return { statusCode: 200, body: JSON.stringify({ status: 'ok', email: 'skipped' }) };
  }

  var subject, html;

  if (formName === 'contact') {
    subject = 'ProPeptide — New Contact Enquiry from ' + esc(data.name || 'Unknown');
    html = buildContactEmail(data);
  } else if (formName === 'wholesale') {
    subject = 'ProPeptide — New Wholesale Enquiry from ' + esc(data.organization || data['org-name'] || 'Unknown');
    html = buildWholesaleEmail(data);
  }

  // Send to both owners
  try {
    var res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ProPeptide <orders@remypeptides.com>',
        to: NOTIFY_EMAILS,
        subject: subject,
        html: html,
        reply_to: data.email || undefined
      })
    });

    if (!res.ok) {
      var errText = await res.text();
      console.error('submission-created: Resend error:', res.status, errText);
      return { statusCode: 502, body: JSON.stringify({ error: 'Email send failed' }) };
    }

    console.log('submission-created: Notification sent for ' + formName + ' form');
  } catch (err) {
    console.error('submission-created: Resend fetch failed:', err.message);
    return { statusCode: 502, body: JSON.stringify({ error: 'Email service unreachable' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ status: 'ok', email: 'sent' }) };
};

function buildContactEmail(data) {
  return [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f1729">',
    '  <div style="text-align:center;padding-bottom:20px;border-bottom:2px solid #0A2463">',
    '    <h1 style="margin:0;font-size:22px;color:#0A2463">New Contact Enquiry</h1>',
    '    <p style="margin:8px 0 0;color:#6b7280;font-size:14px">ProPeptide — propeptide.com</p>',
    '  </div>',
    '  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:20px">',
    '    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;width:120px">Name</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-weight:600">' + esc(data.name || '—') + '</td></tr>',
    '    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Email</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb"><a href="mailto:' + esc(data.email || '') + '" style="color:#0A2463">' + esc(data.email || '—') + '</a></td></tr>',
    '    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Subject</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb">' + esc(data.subject || '—') + '</td></tr>',
    '    <tr><td style="padding:10px 0;color:#6b7280;vertical-align:top">Message</td><td style="padding:10px 0;line-height:1.6">' + esc(data.message || '—') + '</td></tr>',
    '  </table>',
    '  <div style="margin-top:24px;text-align:center">',
    '    <a href="mailto:' + esc(data.email || '') + '" style="display:inline-block;padding:10px 24px;background:#0A2463;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">Reply to ' + esc(data.name || 'Sender') + '</a>',
    '  </div>',
    '  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">',
    '  <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">ProPeptide — For Research Use Only<br>propeptide.com</p>',
    '</div>'
  ].join('\n');
}

function buildWholesaleEmail(data) {
  var orgName = data.organization || data['org-name'] || '—';
  var contactName = data.contact_name || data['contact-name'] || data.name || '—';
  var quantity = data.quantity || '—';

  return [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f1729">',
    '  <div style="text-align:center;padding-bottom:20px;border-bottom:2px solid #0A2463">',
    '    <h1 style="margin:0;font-size:22px;color:#0A2463">New Wholesale Enquiry</h1>',
    '    <p style="margin:8px 0 0;color:#6b7280;font-size:14px">ProPeptide — propeptide.com</p>',
    '  </div>',
    '  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:20px">',
    '    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;width:140px">Organization</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-weight:600">' + esc(orgName) + '</td></tr>',
    '    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Contact Name</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb">' + esc(contactName) + '</td></tr>',
    '    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Email</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb"><a href="mailto:' + esc(data.email || '') + '" style="color:#0A2463">' + esc(data.email || '—') + '</a></td></tr>',
    '    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Phone</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb">' + esc(data.phone || '—') + '</td></tr>',
    '    <tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280">Quantity Needed</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0A2463">' + esc(quantity) + '</td></tr>',
    '    <tr><td style="padding:10px 0;color:#6b7280;vertical-align:top">Message</td><td style="padding:10px 0;line-height:1.6">' + esc(data.message || '—') + '</td></tr>',
    '  </table>',
    '  <div style="margin-top:24px;text-align:center">',
    '    <a href="mailto:' + esc(data.email || '') + '" style="display:inline-block;padding:10px 24px;background:#0A2463;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">Reply to ' + esc(contactName) + '</a>',
    '  </div>',
    '  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">',
    '  <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">ProPeptide — For Research Use Only<br>propeptide.com</p>',
    '</div>'
  ].join('\n');
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
