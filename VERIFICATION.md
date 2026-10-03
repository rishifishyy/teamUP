# TeamUP UI verification

Verified locally on 2026-10-03 with Node.js 22.19.0.

## Checks completed

- `npm run build`: passed.
- `npm test`: 12 tests passed (11 feature groups plus their parent test).
- `npm run lint`: no errors; existing warnings remain.
- Browser checks: login and restored session, request search and filters, request creation and deletion, profile update, Epic ID copy, Creative invite setup, notifications, match acceptance, chat send/end, and logout cleanup.
- Responsive layout and dark/light theme checks were completed during the UI redesign.

The tests use the actual API routes, authentication logic, and Mongoose schema validation, with an isolated in-memory database, captured email output, and a fake Razorpay SDK. They cover OTP signup, password reset, profile persistence, request modes/platforms, ownership, invite expiry, free-pass limits, chat lifetime, and payment signature/order validation. They do not send emails, charge payments, or modify live accounts.

## Fixes included

- Keep Zero Build and Creative map choices compatible with stored data; persist Nintendo IDs and VIP status.
- Validate replacement requests before deleting the previous request and require ownership for deletion and invite actions.
- Keep wizard selections during background polling and initialize invites from the target player's game mode.
- Supply the correct invitation preferences and accepted-match details to notifications.
- Dismiss match confirmations without ending chat; clear chat state on logout.
- Preserve login during temporary network errors and report failed request deletions.
- Persist private password-reset fields without returning tokens in profile responses.
- Verify payment signatures against the server-created order, account, plan, amount, and captured payment. Reject unavailable payment configuration, forged verification, and repeated verification of the same payment.

## Production checks and limits

Before publishing, the deployed homepage, `/api/health`, and anonymous `/api/requests` returned HTTP 200 at https://teamup-x5fq.onrender.com/.

Real email delivery, a real Razorpay checkout, and production MongoDB persistence still need checks with the deployed services. Local tests validate their application logic and schema, but do not establish external-service availability or concurrent database behavior. No real payment was made and no live player data was changed during testing.
