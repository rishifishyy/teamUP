export const mail = [];
const capture = (kind, args) => { mail.push({ kind, args }); return Promise.resolve({ success: true, provider: 'isolated-test' }); };
export const sendRegistrationOtpEmail = (...args) => capture('otp', args);
export const sendWelcomeEmail = (...args) => capture('welcome', args);
export const sendPasswordResetEmail = (...args) => capture('reset', args);
export const sendAccountUpdateEmail = (...args) => capture('profile', args);
export const sendInviteReceivedEmail = (...args) => capture('invite', args);
export const sendInviteAcceptedEmail = (...args) => capture('accepted', args);
export const testEmailTransporter = (...args) => capture('diagnostic', args);
