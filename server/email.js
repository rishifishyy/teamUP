import nodemailer from 'nodemailer';

function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  return 'http://localhost:3000';
}

function getSenderEmail() {
  const user = process.env.EMAIL_USER?.trim().replace(/^["']|["']$/g, '');
  return process.env.EMAIL_FROM || (user ? `TeamUP <${user}>` : 'TeamUP <onboarding@resend.dev>');
}

function getTransporter() {
  const rawUser = process.env.EMAIL_USER;
  const rawPass = process.env.EMAIL_PASS;

  if (!rawUser || !rawPass) {
    return null;
  }

  const user = rawUser.trim().replace(/^["']|["']$/g, '');
  const pass = rawPass.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');

  if (user === 'your_gmail@gmail.com' || pass === 'your_gmail_app_password') {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });
}

// Universal Email Dispatcher: Supports HTTPS API (Brevo / Resend) and SMTP (Nodemailer)
export async function sendRawEmail({ to, subject, html }) {
  const brevoApiKey = process.env.BREVO_API_KEY?.trim().replace(/^["']|["']$/g, '');
  const resendApiKey = process.env.RESEND_API_KEY?.trim().replace(/^["']|["']$/g, '');
  const errors = [];

  // 1. Prioritize Brevo HTTPS API (Works 100% on Render to ANY recipient without custom domain requirement)
  if (brevoApiKey && brevoApiKey.length > 5) {
    try {
      const fromEmail = process.env.BREVO_SENDER_EMAIL?.trim().replace(/^["']|["']$/g, '') || 'arr15demon@gmail.com';
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'accept': 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'TeamUP', email: fromEmail },
          to: [{ email: to.trim().toLowerCase() }],
          subject,
          htmlContent: html
        })
      });

      const data = await res.json();
      if (res.ok) {
        console.log(`✅ [Brevo API] Email sent to ${to} (ID: ${data.messageId})`);
        return { success: true, provider: 'brevo', messageId: data.messageId };
      }
      console.warn('⚠️ [Brevo API] Error:', data.message || JSON.stringify(data));
      errors.push(`Brevo: ${data.message || JSON.stringify(data)}`);
    } catch (err) {
      console.warn('⚠️ [Brevo API] Exception:', err.message);
      errors.push(`Brevo: ${err.message}`);
    }
  }

  // 2. Resend HTTPS API (Works if email is registered user or custom domain is added)
  if (resendApiKey && resendApiKey.startsWith('re_')) {
    try {
      const fromEmail = process.env.RESEND_FROM_DOMAIN || 'TeamUP <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html
        })
      });

      const data = await res.json();
      if (res.ok) {
        console.log(`✅ [Resend API] Email sent to ${to} (ID: ${data.id})`);
        return { success: true, provider: 'resend', messageId: data.id };
      }
      console.warn('⚠️ [Resend API] Error:', data.message || JSON.stringify(data));
      errors.push(`Resend: ${data.message || JSON.stringify(data)}`);
    } catch (err) {
      console.warn('⚠️ [Resend API] Exception:', err.message);
      errors.push(`Resend: ${err.message}`);
    }
  }

  // 3. Fallback to Nodemailer SMTP (Works on localhost or hosts with open SMTP ports)
  const transporter = getTransporter();
  if (transporter) {
    try {
      const info = await Promise.race([
        transporter.sendMail({
          from: getSenderEmail(),
          to,
          subject,
          html
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP connection timeout (Cloud host blocked ports 465/587)')), 6000))
      ]);
      console.log(`✅ [SMTP] Email sent to ${to} (${info.messageId})`);
      return { success: true, provider: 'nodemailer', messageId: info.messageId };
    } catch (err) {
      console.error(`❌ SMTP failed to ${to}:`, err.message);
      errors.push(`SMTP: ${err.message}`);
    }
  }

  console.error(`❌ [All Email Providers Failed for ${to}]:`, errors);
  return { success: false, errors, message: errors.join(' | ') || 'No configured email provider succeeded.' };
}

// Diagnostics test endpoint helper
export async function testEmailTransporter(toEmail) {
  const targetEmail = toEmail || process.env.EMAIL_USER || 'rishinehra1@gmail.com';
  const result = await sendRawEmail({
    to: targetEmail,
    subject: '🧪 TeamUP Live Email Test',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f0f1a; color: #fff; border-radius: 8px;">
        <h2 style="color: #10b981;">🎮 TeamUP Email System is LIVE!</h2>
        <p>If you see this, email sending is 100% operational on your deployed website.</p>
      </div>
    `
  });

  return {
    ...result,
    to: targetEmail,
    env: {
      BREVO_API_KEY: process.env.BREVO_API_KEY ? 'SET (' + process.env.BREVO_API_KEY.substring(0, 8) + '...)' : 'NOT SET',
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET (' + process.env.RESEND_API_KEY.substring(0, 6) + '...)' : 'NOT SET',
      EMAIL_USER: process.env.EMAIL_USER ? 'SET (' + process.env.EMAIL_USER + ')' : 'MISSING',
      EMAIL_PASS: process.env.EMAIL_PASS ? 'SET (Length: ' + process.env.EMAIL_PASS.length + ')' : 'MISSING'
    }
  };
}

// 1. Forgot Password Email
export async function sendPasswordResetEmail(toEmail, resetToken, username = 'Player') {
  const appUrl = getAppUrl();
  const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f0f1a; color: #e2e8f0; border-radius: 12px; overflow: hidden; border: 1px solid #2d2b42;">
      <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 28px 36px; text-align: center;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #fff;">🎮 TeamUP</h1>
        <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">Fortnite Teammate Finder</p>
      </div>
      <div style="padding: 32px 36px;">
        <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #c4b5fd;">Password Reset Request</h2>
        <p style="margin: 0 0 20px; color: #94a3b8; line-height: 1.5; font-size: 14px;">
          Hey ${username}, we received a request to reset your password. Click the button below. This link expires in <strong>1 hour</strong>.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-size: 15px; font-weight: 700;">
            Reset My Password
          </a>
        </div>
        <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">Link: <a href="${resetLink}" style="color: #7c3aed;">${resetLink}</a></p>
      </div>
    </div>
  `;

  return sendRawEmail({ to: toEmail, subject: '🎮 TeamUP — Reset Your Password', html });
}

// 2. Signup / Welcome Email
export async function sendWelcomeEmail(toEmail, username) {
  const appUrl = getAppUrl();

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #0f0f1a; color: #e2e8f0; border-radius: 12px; overflow: hidden; border: 1px solid #2d2b42;">
      <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 32px 40px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #fff;">🎮 TeamUP</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">The Ultimate Fortnite Matchmaking Hub</p>
      </div>

      <div style="padding: 32px 36px;">
        <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 800; color: #fbbf24;">Welcome, ${username}! 👑</h2>
        <p style="margin: 0 0 16px; color: #cbd5e1; line-height: 1.6; font-size: 14px;">
          Your account is now registered and active! You get <strong>2 Free Requests</strong> to create a broadcast or send a match invite. Upgrade to VIP Premium for unlimited matching.
        </p>

        <div style="text-align: center; margin: 28px 0 12px;">
          <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-size: 15px; font-weight: 700;">
            Launch Teammate Finder 🚀
          </a>
        </div>
      </div>

      <div style="padding: 16px 36px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">© 2026 TeamUP · Happy Gaming!</p>
      </div>
    </div>
  `;

  return sendRawEmail({ to: toEmail, subject: `🎉 Welcome to TeamUP, ${username}! Find Your Fortnite Squad`, html });
}

// 3. Username / Email Update Security Notification Email
export async function sendAccountUpdateEmail({ toEmail, username, updateType, oldValue, newValue }) {
  const appUrl = getAppUrl();
  const isEmail = updateType === 'email';
  const title = isEmail ? 'Email Address Updated' : 'Username Updated';
  const detail = isEmail
    ? `Your TeamUP account email address has been successfully changed from <strong>${oldValue}</strong> to <strong>${newValue}</strong>.`
    : `Your TeamUP username has been successfully changed from <strong>${oldValue}</strong> to <strong>${newValue}</strong>.`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f0f1a; color: #e2e8f0; border-radius: 12px; overflow: hidden; border: 1px solid #2d2b42;">
      <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 28px 36px; text-align: center;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #fff;">🎮 TeamUP</h1>
        <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">Account Security Alert</p>
      </div>
      <div style="padding: 32px 36px;">
        <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #60a5fa;">${title}</h2>
        <p style="margin: 0 0 16px; color: #cbd5e1; line-height: 1.5; font-size: 14px;">
          Hey ${username},
        </p>
        <p style="margin: 0 0 20px; color: #cbd5e1; line-height: 1.5; font-size: 14px;">
          ${detail}
        </p>
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 14px 18px; margin: 20px 0; color: #fca5a5; font-size: 13px;">
          If you did not perform this change, please log into your account immediately and reset your password.
        </div>
        <div style="text-align: center; margin: 24px 0 10px;">
          <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700;">
            Go to TeamUP
          </a>
        </div>
      </div>
      <div style="padding: 16px 36px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">© 2026 TeamUP Security Team</p>
      </div>
    </div>
  `;

  return sendRawEmail({ to: toEmail, subject: `🔐 TeamUP — Account Security: ${title}`, html });
}

// 4. Invite / Match Request Received Notification Email
export async function sendInviteReceivedEmail(toEmail, toUsername, senderName, senderEpic, matchDetails) {
  const appUrl = getAppUrl();

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #0f0f1a; color: #e2e8f0; border-radius: 12px; overflow: hidden; border: 1px solid #2d2b42;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 28px 36px; text-align: center;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #fff;">🎯 NEW SQUAD INVITE!</h1>
        <p style="margin: 6px 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">A player wants to party up with your broadcast!</p>
      </div>

      <div style="padding: 32px 36px;">
        <h2 style="margin: 0 0 10px; font-size: 19px; font-weight: 800; color: #34d399;">Hey ${toUsername}!</h2>
        <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 14px; line-height: 1.5;">
          <strong>${senderName}</strong> (Epic: <strong style="color: #60a5fa;">${senderEpic || senderName}</strong>) saw your Fortnite broadcast and sent you a match invite!
        </p>

        <div style="background: #181628; border: 1px solid #2d2b42; border-radius: 10px; padding: 18px 20px; margin: 18px 0;">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 8px; font-weight: 700;">INVITE DETAILS:</div>
          
          <div style="margin-bottom: 8px; font-size: 14px;">
            <span style="color: #94a3b8;">🎮 Epic Games Tag:</span> <strong style="color: #60a5fa;">${senderEpic || 'N/A'}</strong>
          </div>

          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #94a3b8;">
            Region: <strong>${matchDetails?.region || 'NA-East'}</strong> · Mode: <strong>${matchDetails?.mainMode || 'Battle Royale'}</strong>
          </div>
        </div>

        <div style="text-align: center; margin: 24px 0 8px;">
          <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700;">
            View & Accept Invite on TeamUP 🎮
          </a>
        </div>
      </div>

      <div style="padding: 14px 36px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">© 2026 TeamUP · Jump on the Battle Bus!</p>
      </div>
    </div>
  `;

  return sendRawEmail({ to: toEmail, subject: `🎯 TeamUP — New Squad Invite from ${senderEpic || senderName}!`, html });
}

// 5. Match Accepted Notification Email
export async function sendInviteAcceptedEmail(toEmail, toUsername, matchedPlayerName, matchedPlayerEpic) {
  const appUrl = getAppUrl();

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #0f0f1a; color: #e2e8f0; border-radius: 12px; overflow: hidden; border: 1px solid #2d2b42;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 28px 36px; text-align: center;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #fff;">🎉 SQUAD MATCHED!</h1>
        <p style="margin: 6px 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">Your teammate request was accepted!</p>
      </div>

      <div style="padding: 32px 36px;">
        <h2 style="margin: 0 0 10px; font-size: 19px; font-weight: 800; color: #34d399;">Hey ${toUsername}!</h2>
        <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 14px; line-height: 1.5;">
          Great news! <strong>${matchedPlayerName}</strong> (Epic: <strong style="color: #60a5fa;">${matchedPlayerEpic || matchedPlayerName}</strong>) accepted your invite on TeamUP.
        </p>

        <div style="background: #181628; border: 1px solid #2d2b42; border-radius: 10px; padding: 18px 20px; margin: 18px 0;">
          <div style="margin-bottom: 8px; font-size: 14px;">
            <span style="color: #94a3b8;">🎮 Teammate Epic Tag:</span> <strong style="color: #60a5fa;">${matchedPlayerEpic || matchedPlayerName}</strong>
          </div>
          <div style="font-size: 13px; color: #94a3b8;">
            A <strong>15-Minute Live Match Chat</strong> session has been opened between you and ${matchedPlayerName}.
          </div>
        </div>

        <div style="text-align: center; margin: 24px 0 8px;">
          <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700;">
            Open TeamUP Live Chat 💬
          </a>
        </div>
      </div>

      <div style="padding: 14px 36px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">© 2026 TeamUP · Jump on the Battle Bus!</p>
      </div>
    </div>
  `;

  return sendRawEmail({ to: toEmail, subject: `🎉 TeamUP — Match Accepted! ${matchedPlayerName} accepted your request`, html });
}

// 6. Registration OTP Verification Email
export async function sendRegistrationOtpEmail(toEmail, username, otp) {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f0f1a; color: #e2e8f0; border-radius: 12px; overflow: hidden; border: 1px solid #2d2b42;">
      <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 28px 36px; text-align: center;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #fff;">🎮 TeamUP</h1>
        <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">Email Verification Code</p>
      </div>

      <div style="padding: 32px 36px; text-align: center;">
        <h2 style="margin: 0 0 10px; font-size: 20px; font-weight: 800; color: #c4b5fd;">Verify Your Email, ${username}!</h2>
        <p style="margin: 0 0 24px; color: #94a3b8; font-size: 14px; line-height: 1.5;">
          Use the 6-digit verification code below to complete your TeamUP registration.
        </p>

        <div style="background: #181628; border: 2px dashed #7c3aed; border-radius: 12px; padding: 20px; margin: 24px 0; display: inline-block; min-width: 240px;">
          <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #fbbf24; font-family: 'Courier New', monospace;">
            ${otp}
          </div>
        </div>

        <p style="margin: 20px 0 0; color: #64748b; font-size: 13px;">
          ⏱️ This code will expire in <strong>10 minutes</strong>.
        </p>
        <p style="margin: 6px 0 0; color: #64748b; font-size: 12px;">
          If you did not request this code, please ignore this email.
        </p>
      </div>

      <div style="padding: 14px 36px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">© 2026 TeamUP · Jump on the Battle Bus!</p>
      </div>
    </div>
  `;

  return sendRawEmail({ to: toEmail, subject: `🔐 TeamUP Verification Code: ${otp}`, html });
}

