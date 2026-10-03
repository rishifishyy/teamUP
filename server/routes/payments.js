import express from 'express';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { getFallbackDb, saveFallbackDb, getIsMongoConnected } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fortnite_teamup_super_secret_jwt_key_2026_production';
const PLANS = {
  '1 Month': { price: 1000, months: 1 },
  '3 Months': { price: 2800, months: 3 },
  '6 Months': { price: 5300, months: 6 },
  '12 Months': { price: 9990, months: 12 }
};

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || keyId === 'mock_key_id' || !keySecret || keySecret === 'mock_key_secret') return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function getAuthUserId(req) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.slice(7);
    return token ? jwt.verify(token, JWT_SECRET).id : null;
  } catch { return null; }
}

async function findUser(id) {
  return getIsMongoConnected() ? User.findById(id) : getFallbackDb().users.find(user => String(user.id || user._id) === String(id));
}

router.post('/create-order', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'You must be logged in to purchase a premium subscription.' });
    const planType = req.body.planType || '1 Month';
    if (!Object.hasOwn(PLANS, planType)) return res.status(400).json({ error: 'Choose a valid premium plan.' });
    if (!await findUser(userId)) return res.status(404).json({ error: 'User not found.' });
    const rzp = getRazorpay();
    if (!rzp) return res.status(503).json({ error: 'Payments are currently unavailable. Please try again later.' });
    const order = await rzp.orders.create({
      amount: PLANS[planType].price * 100,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { planType, userId: String(userId) }
    });
    return res.json({ ...order, planType, key_id: process.env.RAZORPAY_KEY_ID, isMock: false });
  } catch (err) {
    console.error('Order creation failed:', err.message);
    return res.status(500).json({ error: 'Could not create a payment order. Please try again.' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) {
      return res.status(400).json({ error: 'Invalid payment verification details.' });
    }
    const rzp = getRazorpay();
    if (!rzp) return res.status(503).json({ error: 'Payments are currently unavailable. Please try again later.' });
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest();
    if (!crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'))) {
      return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
    }
    // Trust the server-created order for account, plan and amount.
    const order = await rzp.orders.fetch(orderId);
    if (String(order.notes?.userId) !== String(userId)) return res.status(403).json({ error: 'This payment belongs to another account.' });
    const planType = order.notes?.planType;
    if (!Object.hasOwn(PLANS, planType)) return res.status(400).json({ error: 'Invalid payment plan.' });
    const payment = await rzp.payments.fetch(paymentId);
    const plan = PLANS[planType];
    if (payment.order_id !== orderId || payment.status !== 'captured' || payment.currency !== 'INR' || order.currency !== 'INR' || payment.amount !== plan.price * 100 || order.amount !== plan.price * 100) {
      return res.status(400).json({ error: 'Payment has not been captured for the selected plan. Please contact support if you were charged.' });
    }
    const user = await findUser(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.subscription?.history?.some(entry => entry.paymentId === paymentId)) {
      return res.json({ success: true, message: 'This payment has already been verified.' });
    }
    const now = new Date();
    const previousEnd = new Date(user.subscription?.endDate || 0);
    const endDate = user.isPremium && previousEnd > now ? previousEnd : new Date(now);
    endDate.setMonth(endDate.getMonth() + plan.months);
    user.isPremium = true;
    user.subscription = {
      plan: planType,
      startDate: now,
      endDate,
      history: [...(user.subscription?.history || []), { plan: planType, amount: plan.price, date: now, paymentId }]
    };
    if (getIsMongoConnected()) await user.save();
    else saveFallbackDb();
    return res.json({ success: true, message: `Payment verified successfully. Welcome to Premium (${planType})!` });
  } catch (err) {
    console.error('Verification failed:', err.message);
    return res.status(500).json({ error: 'Could not verify the payment. Please contact support if you were charged.' });
  }
});

export default router;
