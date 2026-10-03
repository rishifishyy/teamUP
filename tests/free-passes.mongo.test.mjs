import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import mongoose from 'mongoose';
register('./mock-loader.mjs', import.meta.url);
const { setMongoConnected } = await import('./mock-db.mjs');
const { User } = await import('../server/models/User.js');
const { refreshFreePasses, consumeFreePass, refundFreePass, FREE_PASS_REFILL_MS } = await import('../server/freePasses.js');

await test('MongoDB free-pass updates in a disposable test database', { skip: !process.env.TEAMUP_MONGO_TEST_URI }, async t => {
  const database = `tu_refill_test_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  try {
    await mongoose.connect(process.env.TEAMUP_MONGO_TEST_URI, { dbName: database, serverSelectionTimeoutMS: 10000 });
    setMongoConnected(true);
    const create = username => User.create({ username, email: `${username}@example.test`, password: 'test-only-hash', epicTag: username, age: 20, gender: 'Other' });
    await t.test('first match has no timer; second starts timer; exact deadline refills', async () => {
      const user = await create('TimerAudit');
      const now = new Date();
      assert.equal((await consumeFreePass(user, 'postsCount', now)).allowed, true);
      assert.equal(user.freePassesRefillAt, null);
      assert.equal((await consumeFreePass(user, 'invitesCount', now)).allowed, true);
      assert.equal(user.freePassesRefillAt.getTime(), now.getTime() + FREE_PASS_REFILL_MS);
      assert.equal((await consumeFreePass(user, 'invitesCount', now)).allowed, false);
      const deadline = new Date(user.freePassesRefillAt);
      assert.equal(await refreshFreePasses(user, new Date(deadline.getTime() - 1)), false);
      assert.equal(await refreshFreePasses(user, deadline), true);
      // A later save of an unrelated field must not overwrite the atomic counter update.
      await consumeFreePass(await User.findById(user._id), 'invitesCount', deadline);
      user.region = 'Asia';
      await user.save();
      const saved = await User.findById(user._id);
      assert.equal(saved.postsCount, 0);
      assert.equal(saved.invitesCount, 1);
      assert.equal(saved.freePassesRefillAt, null);
    });
    await t.test('concurrent consumption cannot spend more than two passes', async () => {
      const user = await create('ConcurrentAudit');
      const copies = await Promise.all([0,1,2].map(()=>User.findById(user._id)));
      const results = await Promise.all(copies.map(copy=>consumeFreePass(copy,'invitesCount')));
      assert.equal(results.filter(result=>result.allowed).length,2);
      const saved = await User.findById(user._id);
      assert.equal(saved.invitesCount,2);
      assert.ok(saved.freePassesRefillAt);
      await refundFreePass(saved,'invitesCount');
      assert.equal((await User.findById(user._id)).invitesCount,1);
      assert.equal((await User.findById(user._id)).freePassesRefillAt,null);
    });
    await t.test('concurrent expired refresh restores exactly one fresh allowance', async () => {
      const user = await create('RefillAudit');
      await User.updateOne({_id:user._id},{$set:{postsCount:2,freePassesRefillAt:new Date(Date.now()-1)}});
      const copies = await Promise.all([0,1,2].map(()=>User.findById(user._id)));
      const results = await Promise.all(copies.map(copy=>refreshFreePasses(copy)));
      assert.equal(results.filter(Boolean).length,1);
      const saved = await User.findById(user._id);
      assert.equal(saved.postsCount+saved.invitesCount,0);
      assert.equal(saved.freePassesRefillAt,null);
    });
  } finally {
    try {
      if(mongoose.connection.readyState===1){
        assert.equal(mongoose.connection.name,database);
        assert.match(database,/^tu_refill_test_\d+_[a-z0-9]+$/);
        await mongoose.connection.dropDatabase();
      }
    } finally {
      setMongoConnected(false);
      await mongoose.disconnect();
    }
  }
});
