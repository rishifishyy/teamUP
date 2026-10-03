# TeamUP UI verification

Verified locally on 2026-10-03 with Node.js 22.19.0.

## Checks completed

- `npm run build`: passed.
- Feature regression checks: 15 tests passed (14 feature groups plus their parent test).
- MongoDB integration checks: 4 tests passed in a disposable database (3 feature groups plus their parent test). The test database was removed after the checks.
- `npm run lint`: no errors; existing warnings remain.
- Browser checks: login and restored session, request search and filters, request creation and deletion, profile update, Epic ID copy, Creative invite setup, notifications, match acceptance, chat send/end, and logout cleanup.
- Responsive layout and dark/light theme checks were completed during the UI redesign. Theme changes now use a 420 ms crossfade, with CSS color transitions as a fallback and reduced-motion support.
- The refill date and depleted-pass display were checked in the browser with an isolated test account.

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

The user confirmed receiving a password-reset email on 2026-10-03. MongoDB connectivity was verified while exporting the requested database records. Real Razorpay checkout remains untested; no real payment was made during testing.

## Free-pass refill rule

- Each free account gets two successful matches. Sending an invitation, posting a lookup, and declined or expired invitations do not spend a pass.
- The first accepted match leaves one pass and starts no timer. The second accepted match starts a 14-day timer for that account.
- At the deadline, both passes become available again. Login, account polling, posting, invitation sending, and match acceptance refresh expired allowances on the server, including after a server restart or sleep.
- VIP accounts keep unlimited matching and their existing subscriptions. The one-time reset clears only the free-pass counters and refill date for every existing account.
- MongoDB tests cover the exact refill boundary, concurrent deductions, concurrent refills, and preserving atomic pass updates during unrelated profile saves.
- `scripts/reset-free-passes.mjs` previews affected accounts by default. Applying the reset requires `--apply --backup <local-file-path>`; it saves the previous counters and membership data before updating and verifies the result. The backup stays outside GitHub.
- The MongoDB test is skipped unless `TEAMUP_MONGO_TEST_URI` is provided. It always uses a newly named disposable database rather than the application's database.
