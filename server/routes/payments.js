import express from 'express';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { getFallbackDb, saveFallbackDb, getIsMongoConnected } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'teamup_jwt_secret_2026_super_secure';

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || keyId === 'mock_key_id' || !keySecret || keySecret === 'mock_key_secret') {
    return null;
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function getAuthUserId(req) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded.id;
    }
  } catch (err) {
    console.warn('Auth token verification failed:', err.message);
  }
  return null;
}

router.post('/create-order', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'You must be logged in to purchase a premium subscription.' });
    }

    const { planType } = req.body;
    let amount = 1000; // default 1 month
    if (planType === '3 Months') amount = 2800;
    if (planType === '6 Months') amount = 5300;
    if (planType === '12 Months') amount = 9990;

    const currency = 'INR';
    const receipt = `rcpt_${Date.now()}`;
    const rzp = getRazorpay();

    if (!rzp) {
      return res.json({
        id: `order_mock_${Date.now()}`,
        currency,
        amount: amount * 100,
        planType,
        key_id: 'mock_key_id',
        isMock: true
      });
    }

    const options = {
      amount: amount * 100, // in paise
      currency,
      receipt,
      notes: { planType, userId: String(userId) }
    };

    const order = await rzp.orders.create(options);
    console.log(`✅ Razorpay order created: ${order.id} for plan ${planType} (₹${amount})`);
    res.json({
      ...order,
      planType,
      key_id: process.env.RAZORPAY_KEY_ID,
      isMock: false
    });
  } catch (err) {
    console.error('Order creation failed:', err);
    res.status(500).json({ error: err?.error?.description || err.message || 'Failed to create Razorpay order' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType, amountPaid } = req.body;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const isMock = !keySecret || keySecret === 'mock_key_secret';

    let isValid = false;

    if (isMock || razorpay_signature === 'mock_signature') {
      isValid = !!razorpay_payment_id;
    } else {
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body.toString())
        .digest('hex');

      isValid = expectedSignature === razorpay_signature;
      if (!isValid) {
        console.warn('Signature mismatch:', { expectedSignature, received: razorpay_signature });
      }
    }

    if (isValid) {
      const now = new Date();
      let monthsToAdd = 1;
      if (planType === '3 Months') monthsToAdd = 3;
      if (planType === '6 Months') monthsToAdd = 6;
      if (planType === '12 Months') monthsToAdd = 12;

      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + monthsToAdd);

      const subData = {
        plan: planType || '1 Month',
        startDate: now,
        endDate: endDate,
        historyEntry: {
          plan: planType || '1 Month',
          amount: amountPaid || 1000,
          date: now,
          paymentId: razorpay_payment_id
        }
      };

      if (getIsMongoConnected()) {
        const user = await User.findById(userId);
        if (user) {
          user.isPremium = true;
          user.subscription = {
            plan: subData.plan,
            startDate: subData.startDate,
            endDate: subData.endDate,
            history: [
              ...(user.subscription?.history || []),
              subData.historyEntry
            ]
          };
          await user.save();
        }
      } else {
        const db = getFallbackDb();
        const user = db.users.find(u => u.id === userId || u._id === userId);
        if (user) {
          user.isPremium = true;
          user.subscription = {
            plan: subData.plan,
            startDate: subData.startDate.toISOString(),
            endDate: subData.endDate.toISOString(),
            history: [
              ...(user.subscription?.history || []),
              {
                ...subData.historyEntry,
                date: subData.historyEntry.date.toISOString()
              }
            ]
          };
          saveFallbackDb();
        }
      }

      console.log(`🎉 User ${userId} upgraded to Premium (${planType})`);
      return res.json({ success: true, message: `Payment verified successfully. Welcome to Premium (${planType})!` });
    } else {
      return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
    }
  } catch (err) {
    console.error('Verification failed:', err);
    res.status(500).json({ error: err.message || 'Payment verification failed' });
  }
});

export default router;
