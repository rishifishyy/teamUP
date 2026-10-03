import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { createHmac } from 'node:crypto';
register('./mock-loader.mjs', import.meta.url);
process.env.VERCEL = '1';
process.env.JWT_SECRET = 'isolated-teamup-regression-test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_isolated';
process.env.RAZORPAY_KEY_SECRET = 'isolated-payment-secret';
const { default: app } = await import('../server/index.js');
const { getFallbackDb, resetDb } = await import('./mock-db.mjs');
const { mail } = await import('./mock-email.mjs');
const { payments } = await import('./mock-razorpay.mjs');
const { User } = await import('../server/models/User.js');
const { Request } = await import('../server/models/Request.js');

await test('TeamUP feature regression checks (isolated data and providers)', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, method = 'GET', body, token) => {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, ...(body !== undefined && { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() };
  };
  const expect = async (path, method, body, token, status) => {
    const result = await call(path, method, body, token);
    assert.equal(result.status, status, `${method} ${path}: ${JSON.stringify(result.body)}`);
    return result.body;
  };
  const createUser = async name => {
    const details = { username: name, email: `${name.toLowerCase()}@example.test`, password: 'Test-only-pass-42', epicTag: name + 'Epic', age: 20, gender: 'Other', region: 'Asia', nintendoId: name + 'Switch' };
    await expect('/auth/send-registration-otp', 'POST', details, null, 200);
    const otp = mail.findLast(item => item.kind === 'otp' && item.args[0] === details.email).args[2];
    const result = await expect('/auth/signup', 'POST', { ...details, otp }, null, 201);
    return { ...result, details };
  };
  const postData = { gamertag: 'TestEpic', region: 'Asia', mainMode: 'Ranked', buildType: 'Zero Build', teamSize: 'Duos', platform: 'Nintendo', rank: 'Diamond', hasMic: true, note: 'Isolated regression request' };
  const fixture = async () => { resetDb(); mail.length = 0; return { a: await createUser('AuditAlpha'), b: await createUser('AuditBravo'), c: await createUser('AuditCharlie') }; };
  const post = async user => (await expect('/requests', 'POST', { ...postData, epicTag: user.user.epicTag }, user.token, 201)).request;
  const send = async (user, request) => expect(`/matches/${request.id}/request`, 'POST', { platform: 'PC', region: 'Asia', hasMic: 'Yes', note: 'Test invite' }, user.token, 201);
  try {
    await t.test('API client preserves network errors and rejects failed deletions', async () => {
      const savedFetch = globalThis.fetch;
      const savedStorage = globalThis.localStorage;
      globalThis.localStorage = { getItem: () => 'test-token' };
      const { api } = await import('../src/services/api.js');
      try {
        globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Temporarily unavailable' }), { status: 503 });
        await assert.rejects(api.getMe(), /Temporarily unavailable/);
        await assert.rejects(api.deleteRequest('test-request'), /Temporarily unavailable/);
        globalThis.fetch = async () => new Response('{}', { status: 401 });
        assert.equal(await api.getMe(), null);
        globalThis.fetch = async () => { throw new Error('Network unavailable'); };
        await assert.rejects(api.getMe(), /Network unavailable/);
        await assert.rejects(api.deleteRequest('test-request'), /Network unavailable/);
      } finally { globalThis.fetch = savedFetch; globalThis.localStorage = savedStorage; }
    });
    await t.test('health and anonymous feed', async () => {
      assert.equal((await expect('/health', 'GET', undefined, null, 200)).status, 'ok');
      assert.ok(Array.isArray((await expect('/requests', 'GET', undefined, null, 200)).requests));
    });
    await t.test('OTP signup, login, session restoration, validation and profile update', async () => {
      const { a } = await fixture();
      await expect('/auth/signup', 'POST', { ...a.details, otp: 'invalid' }, null, 400);
      await expect('/auth/login', 'POST', { loginOrEmail: a.details.username, password: 'wrong' }, null, 401);
      const login = await expect('/auth/login', 'POST', { loginOrEmail: a.details.email, password: a.details.password }, null, 200);
      assert.equal((await expect('/auth/me', 'GET', undefined, login.token, 200)).user.username, a.user.username);
      const profile = await expect('/auth/profile', 'PUT', { epicTag: 'UpdatedTestEpic', nintendoId: 'UpdatedSwitch' }, a.token, 200);
      assert.equal(profile.user.epicTag, 'UpdatedTestEpic');
      await expect('/auth/profile', 'PUT', { username: 'ChangedWithoutPassword' }, a.token, 400);
      await expect('/auth/me', 'GET', undefined, 'invalid', 401);
    });
    await t.test('MongoDB schema keeps Zero Build, VIP, Nintendo and password-reset fields', async () => {
      const doc = new Request({ ...postData, userId: 'abc', username: 'Audit', epicTag: 'TestEpic', userAge: 20, isPremium: true });
      await doc.validate();
      assert.equal(doc.toObject().isPremium, true);
      const user = new User({ username: 'Schema', email: 'schema@example.test', password: 'hash', epicTag: 'SchemaEpic', age: 20, gender: 'Other', nintendoId: 'SchemaSwitch', resetToken: 'reset-test', resetTokenExpiry: new Date() });
      assert.equal(user.toObject().nintendoId, 'SchemaSwitch');
      assert.equal(user.toObject().resetToken, 'reset-test');
    });
    await t.test('password reset is single-use and secrets stay out of profile responses', async () => {
      const { a } = await fixture();
      await expect('/auth/forgot-password', 'POST', { email: a.details.email }, null, 200);
      const token = mail.findLast(item => item.kind === 'reset').args[1];
      const me = await expect('/auth/me', 'GET', undefined, a.token, 200);
      assert.equal(me.user.resetToken, undefined);
      await expect('/auth/reset-password', 'POST', { token: 'bad', newPassword: 'New-test-pass' }, null, 400);
      await expect('/auth/reset-password', 'POST', { token, newPassword: 'New-test-pass' }, null, 200);
      await expect('/auth/reset-password', 'POST', { token, newPassword: 'Another-pass' }, null, 400);
      await expect('/auth/login', 'POST', { loginOrEmail: a.user.username, password: 'New-test-pass' }, null, 200);
    });
    await t.test('request creation, replacement, validation, expiry and ownership', async () => {
      const { a, b } = await fixture();
      await expect('/requests', 'POST', postData, null, 401);
      const first = await post(a);
      await expect('/requests', 'POST', { ...postData, mainMode: 'Invalid' }, a.token, 400);
      assert.equal(getFallbackDb().requests[0].id, first.id);
      const replaced = await post(a);
      assert.equal(getFallbackDb().requests.length, 1);
      await expect(`/requests/${replaced.id}`, 'DELETE', undefined, null, 401);
      await expect(`/requests/${replaced.id}`, 'DELETE', undefined, b.token, 403);
      assert.equal(getFallbackDb().requests.length, 1);
      await expect(`/requests/${replaced.id}`, 'DELETE', undefined, a.token, 200);
      const expired = await post(a);
      getFallbackDb().requests[0].createdAt = new Date(Date.now() - 16 * 60 * 1000).toISOString();
      assert.equal((await expect('/requests', 'GET', undefined, null, 200)).requests.length, 0);
      await expect(`/matches/${expired.id}/request`, 'POST', {}, b.token, 404);
    });
    await t.test('all request modes, platforms and legacy build values remain compatible', async () => {
      const { a } = await fixture();
      for (const platform of ['PC', 'PlayStation', 'Xbox', 'Nintendo', 'Any']) {
        for (const mainMode of ['Ranked', 'Unranked', 'Creative']) {
          const details = { ...postData, platform, mainMode, creativeType: 'Zonewars', buildType: 'Zero Build' };
          const request = (await expect('/requests', 'POST', details, a.token, 201)).request;
          assert.equal(request.platform, platform);
          assert.equal(request.mainMode, mainMode);
          await new Request({ ...request, _id: undefined, userAge: 20 }).validate();
        }
      }
      const legacy = (await expect('/requests', 'POST', { ...postData, buildType: 'No Build' }, a.token, 201)).request;
      assert.equal(legacy.buildType, 'Zero Build');
      getFallbackDb().requests[0].buildType = 'No Build';
      assert.equal((await expect('/requests', 'GET', undefined, null, 200)).requests[0].buildType, 'Zero Build');
      for (const creativeType of ['Box Fight', 'Zonewars', '1v1', 'Realistics']) {
        const request = (await expect('/requests', 'POST', { ...postData, mainMode: 'Creative', creativeType }, a.token, 201)).request;
        await new Request({ ...request, _id: undefined }).validate();
      }
    });
    await t.test('invite notifications, accept, matched passes and chat lifecycle', async () => {
      const { a, b, c } = await fixture();
      const request = await post(a);
      await post(b);
      await expect(`/matches/${request.id}/request`, 'POST', {}, a.token, 400);
      await send(b, request);
      await expect(`/matches/${request.id}/request`, 'POST', {}, b.token, 400);
      const incoming = (await expect('/matches/incoming', 'GET', undefined, a.token, 200)).incoming;
      const id = incoming[0].id;
      const notification = (await expect('/matches/notifications', 'GET', undefined, a.token, 200)).incoming[0];
      assert.equal(notification.senderRegion, 'Asia');
      assert.equal(notification.senderMic, 'Yes');
      assert.equal(notification.senderNote, 'Test invite');
      assert.equal(notification.postMainMode, 'Ranked');
      await expect(`/matches/${id}/accept`, 'POST', undefined, c.token, 403);
      await expect(`/matches/${id}/decline`, 'POST', undefined, c.token, 403);
      await expect(`/matches/${id}/accept`, 'POST', undefined, a.token, 200);
      await expect(`/matches/${id}/accept`, 'POST', undefined, a.token, 400);
      assert.equal(getFallbackDb().requests.length, 0);
      assert.equal((await expect('/auth/me', 'GET', undefined, a.token, 200)).user.postsCount, 1);
      assert.equal((await expect('/auth/me', 'GET', undefined, b.token, 200)).user.invitesCount, 1);
      const accepted = (await expect('/matches/notifications', 'GET', undefined, b.token, 200)).accepted;
      assert.equal(accepted.matchId, id);
      assert.equal(accepted.matchedPlayer.epicTag, a.user.epicTag);
      await expect('/matches/dismiss', 'POST', undefined, a.token, 200);
      assert.equal(getFallbackDb().matchRequests[0].isChatEnded, undefined);
      assert.ok((await expect('/chat/active-session', 'GET', undefined, b.token, 200)).hasActiveChat);
      await expect(`/chat/${id}/messages`, 'GET', undefined, c.token, 403);
      await expect(`/chat/${id}/message`, 'POST', { text: ' ' }, a.token, 400);
      await expect(`/chat/${id}/message`, 'POST', { text: 'Hello from test Alpha' }, a.token, 201);
      assert.equal((await expect(`/chat/${id}/messages`, 'GET', undefined, b.token, 200)).messages.length, 1);
      await expect(`/chat/${id}/end`, 'POST', undefined, c.token, 403);
      await expect(`/chat/${id}/end`, 'POST', undefined, a.token, 200);
      assert.ok((await expect('/chat/active-session', 'GET', undefined, b.token, 200)).isEnded);
      assert.equal((await expect('/matches/notifications', 'GET', undefined, b.token, 200)).accepted, null);
      await expect(`/chat/${id}/message`, 'POST', { text: 'After end' }, b.token, 400);
    });
    await t.test('decline, notification dismissal and free-tier restriction', async () => {
      const { a, b, c } = await fixture();
      const request = await post(a);
      await send(b, request);
      const id = getFallbackDb().matchRequests[0].id;
      await expect(`/matches/${id}/decline`, 'POST', undefined, a.token, 200);
      assert.equal((await expect('/matches/notifications', 'GET', undefined, b.token, 200)).declined.length, 1);
      await expect(`/matches/notifications/${id}`, 'DELETE', undefined, c.token, 403);
      await expect(`/matches/notifications/${id}`, 'DELETE', undefined, b.token, 200);
      assert.equal((await expect('/matches/notifications', 'GET', undefined, b.token, 200)).declined.length, 0);
      const limited = getFallbackDb().users.find(user => user.id === b.user.id);
      limited.invitesCount = 2;
      await expect('/requests', 'POST', postData, b.token, 403);
      await expect(`/matches/${request.id}/request`, 'POST', {}, b.token, 403);
    });
    await t.test('expired invites cannot be accepted and expired chats cannot send', async () => {
      const { a, b } = await fixture();
      await send(b, await post(a));
      const match = getFallbackDb().matchRequests[0];
      match.createdAt = new Date(Date.now() - 11 * 60 * 1000).toISOString();
      await expect(`/matches/${match.id}/accept`, 'POST', undefined, a.token, 400);
      match.status = 'accepted';
      match.matchedAt = new Date(Date.now() - 16 * 60 * 1000).toISOString();
      await expect(`/chat/${match.id}/message`, 'POST', { text: 'Expired test' }, a.token, 400);
    });
    await t.test('payment rejects forged verification and checks server plan, owner, capture and replay', async () => {
      const { a, b } = await fixture();
      await expect('/payments/create-order', 'POST', { planType: '1 Month' }, null, 401);
      await expect('/payments/create-order', 'POST', { planType: 'Invalid' }, a.token, 400);
      await expect('/payments/verify', 'POST', { razorpay_order_id: 'order_mock_bypass', razorpay_payment_id: 'pay_fake', razorpay_signature: 'mock_signature' }, a.token, 400);
      assert.equal(getFallbackDb().users.find(user => user.id === a.user.id).isPremium, false);
      const order = await expect('/payments/create-order', 'POST', { planType: '3 Months' }, a.token, 200);
      assert.equal(order.amount, 280000);
      const id = 'pay_isolated';
      payments.set(id, { id, order_id: order.id, status: 'captured', amount: order.amount, currency: 'INR' });
      const verification = { razorpay_order_id: order.id, razorpay_payment_id: id, razorpay_signature: createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${order.id}|${id}`).digest('hex'), planType: '12 Months', amountPaid: 1 };
      await expect('/payments/verify', 'POST', verification, b.token, 403);
      payments.get(id).status = 'authorized';
      await expect('/payments/verify', 'POST', verification, a.token, 400);
      payments.get(id).status = 'captured';
      await expect('/payments/verify', 'POST', verification, a.token, 200);
      const user = getFallbackDb().users.find(user => user.id === a.user.id);
      assert.equal(user.subscription.plan, '3 Months');
      assert.equal(user.subscription.history[0].amount, 2800);
      await expect('/payments/verify', 'POST', verification, a.token, 200);
      assert.equal(user.subscription.history.length, 1);
      const end = new Date(user.subscription.endDate).getTime();
      const renewal = await expect('/payments/create-order', 'POST', { planType: '1 Month' }, a.token, 200);
      payments.set('pay_renewal', { order_id: renewal.id, status: 'captured', amount: renewal.amount, currency: 'INR' });
      await expect('/payments/verify', 'POST', { razorpay_order_id: renewal.id, razorpay_payment_id: 'pay_renewal', razorpay_signature: createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${renewal.id}|pay_renewal`).digest('hex') }, a.token, 200);
      assert.ok(new Date(user.subscription.endDate).getTime() > end);
      delete process.env.RAZORPAY_KEY_SECRET;
      await expect('/payments/create-order', 'POST', { planType: '1 Month' }, a.token, 503);
      process.env.RAZORPAY_KEY_SECRET = 'isolated-payment-secret';
    });
  } finally { await new Promise(resolve => server.close(resolve)); }
});
