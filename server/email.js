import nodemailer from 'nodemailer';

function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const isMock = !user || user === 'your_gmail@gmail.com' || !pass || pass === 'your_gmail_app_password';

  if (isMock) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

// 1. Forgot Password Email
export async function sendPasswordResetEmail(toEmail, resetToken, username = 'Player') {
  const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
  const transporter = getTransporter();

  if (!transporter) {
    console.log('\n📧 [DEV MODE] Password reset email would be sent to:', toEmail);
    console.log('🔗 Reset Link:', resetLink);
    return { success: true, devMode: true, resetLink };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `TeamUP <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🎮 TeamUP — Reset Your Password',
    html: `
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
    `
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Password reset email sent to ${toEmail} (${info.messageId})`);
  return { success: true, devMode: false };
}

// 2. Signup / Welcome Email
export async function sendWelcomeEmail(toEmail, username) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`\n📧 [DEV MODE] Welcome email would be sent to: ${toEmail} (${username})\n`);
    return { success: true, devMode: true };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `TeamUP <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🎉 Welcome to TeamUP, ${username}! Find Your Fortnite Squad`,
    html: `
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
            <a href="http://localhost:3000" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-size: 15px; font-weight: 700;">
              Launch Teammate Finder 🚀
            </a>
          </div>
        </div>

        <div style="padding: 16px 36px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
          <p style="margin: 0; color: #64748b; font-size: 12px;">© 2026 TeamUP · Happy Gaming!</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${toEmail} (${info.messageId})`);
    return { success: true, devMode: false };
  } catch (err) {
    console.warn(`⚠️ Failed to send welcome email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

// 3. Username / Email Update Security Notification Email
export async function sendAccountUpdateEmail({ toEmail, username, updateType, oldValue, newValue }) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`\n📧 [DEV MODE] Account Update email would be sent to: ${toEmail} (${updateType}: ${oldValue} -> ${newValue})\n`);
    return { success: true, devMode: true };
  }

  const isEmail = updateType === 'email';
  const title = isEmail ? 'Email Address Updated' : 'Username Updated';
  const detail = isEmail
    ? `Your TeamUP account email address has been successfully changed from <strong>${oldValue}</strong> to <strong>${newValue}</strong>.`
    : `Your TeamUP username has been successfully changed from <strong>${oldValue}</strong> to <strong>${newValue}</strong>.`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `TeamUP <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🔐 TeamUP — Account Security: ${title}`,
    html: `
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
            <a href="http://localhost:3000" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700;">
              Go to TeamUP
            </a>
          </div>
        </div>
        <div style="padding: 16px 36px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
          <p style="margin: 0; color: #64748b; font-size: 12px;">© 2026 TeamUP Security Team</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Account update email sent to ${toEmail} (${info.messageId})`);
    return { success: true, devMode: false };
  } catch (err) {
    console.warn(`⚠️ Failed to send account update email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

// 4. Invite / Match Request Received Notification Email
export async function sendInviteReceivedEmail(toEmail, toUsername, senderName, senderEpic, matchDetails) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`\n📧 [DEV MODE] Match Invite email would be sent to: ${toEmail} from ${senderName} (Epic: ${senderEpic})\n`);
    return { success: true, devMode: true };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `TeamUP <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🎯 TeamUP — New Squad Invite from ${senderEpic || senderName}!`,
    html: `
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
            <a href="http://localhost:3000" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700;">
              View & Accept Invite on TeamUP 🎮
            </a>
          </div>
        </div>

        <div style="padding: 14px 36px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
          <p style="margin: 0; color: #64748b; font-size: 12px;">© 2026 TeamUP · Jump on the Battle Bus!</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Invite notification email sent to ${toEmail} (${info.messageId})`);
    return { success: true, devMode: false };
  } catch (err) {
    console.warn(`⚠️ Failed to send invite notification email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}
