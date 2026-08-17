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

export async function sendPasswordResetEmail(toEmail, resetToken, baseUrl) {
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
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
            We received a request to reset your password. Click the button below. This link expires in <strong>1 hour</strong>.
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
            Your account is now ready! You can broadcast teammate requests, filter by regional servers, Ranked/Creative game modes, mic requirement, and team up with players who match your playstyle.
          </p>

          <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
            <div style="font-weight: 700; color: #c4b5fd; margin-bottom: 8px; font-size: 13px;">⚡ QUICK TIPS TO GET STARTED:</div>
            <ul style="margin: 0; padding-left: 18px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
              <li>Ensure your <strong>Epic Games Gamertag</strong> is accurate.</li>
              <li>Free tier accounts can post 1 broadcast every 7 days.</li>
              <li>Upgrade to <strong>VIP Premium</strong> for unlimited broadcasts &amp; top priority placement!</li>
            </ul>
          </div>

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

export async function sendMatchNotificationEmail(toEmail, toUsername, matchedPlayer, matchDetails) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`\n📧 [DEV MODE] Match Notification email would be sent to: ${toEmail} from ${matchedPlayer.username}\n`);
    return { success: true, devMode: true };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `TeamUP <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🎯 Match Found! ${matchedPlayer.epicTag || matchedPlayer.username} wants to Team UP!`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #0f0f1a; color: #e2e8f0; border-radius: 12px; overflow: hidden; border: 1px solid #2d2b42;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 28px 36px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #fff;">🎯 VICTORY MATCH FOUND!</h1>
          <p style="margin: 6px 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">A player just matched with your Fortnite broadcast!</p>
        </div>

        <div style="padding: 32px 36px;">
          <h2 style="margin: 0 0 10px; font-size: 19px; font-weight: 800; color: #34d399;">Hey ${toUsername}!</h2>
          <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 14px; line-height: 1.5;">
            <strong>${matchedPlayer.username || matchedPlayer.epicTag}</strong> selected your teammate broadcast and wants to party up right now.
          </p>

          <div style="background: #181628; border: 1px solid #2d2b42; border-radius: 10px; padding: 18px 20px; margin: 18px 0;">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 8px; font-weight: 700;">MATCHED PLAYER DETAILS:</div>
            
            <div style="margin-bottom: 8px; font-size: 14px;">
              <span style="color: #94a3b8;">🎮 Epic Games Tag:</span> <strong style="color: #60a5fa;">${matchedPlayer.epicTag || 'N/A'}</strong>
            </div>

            ${matchedPlayer.discordId ? `
            <div style="margin-bottom: 8px; font-size: 14px;">
              <span style="color: #94a3b8;">💬 Discord:</span> <strong style="color: #a78bfa;">${matchedPlayer.discordId}</strong>
            </div>` : ''}

            ${matchedPlayer.psnId ? `
            <div style="margin-bottom: 8px; font-size: 14px;">
              <span style="color: #94a3b8;">🟦 PSN:</span> <strong style="color: #38bdf8;">${matchedPlayer.psnId}</strong>
            </div>` : ''}

            ${matchedPlayer.xboxId ? `
            <div style="margin-bottom: 8px; font-size: 14px;">
              <span style="color: #94a3b8;">🟩 Xbox:</span> <strong style="color: #4ade80;">${matchedPlayer.xboxId}</strong>
            </div>` : ''}

            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #94a3b8;">
              Region: <strong>${matchDetails?.region || 'Matching'}</strong> · Mode: <strong>${matchDetails?.mainMode || 'Battle Royale'}</strong>
            </div>
          </div>

          <p style="margin: 16px 0; color: #94a3b8; font-size: 13px; text-align: center;">
            Both of your broadcasts have been marked as matched and removed from the active queue.
          </p>

          <div style="text-align: center; margin: 24px 0 8px;">
            <a href="http://localhost:3000" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700;">
              Open TeamUP &amp; Party Up 🎮
            </a>
          </div>
        </div>

        <div style="padding: 14px 36px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
          <p style="margin: 0; color: #64748b; font-size: 12px;">© 2026 TeamUP · Good luck on the battle bus!</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Match notification email sent to ${toEmail} (${info.messageId})`);
    return { success: true, devMode: false };
  } catch (err) {
    console.warn(`⚠️ Failed to send match notification to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}
