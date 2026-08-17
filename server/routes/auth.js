import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { getFallbackDb, saveFallbackDb, getIsMongoConnected } from '../db.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../email.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'teamup_jwt_secret_2026_super_secure';

function checkSubscriptionExpiry(user) {
  if (user && user.isPremium && user.subscription?.endDate) {
    const expiry = new Date(user.subscription.endDate);
    if (expiry < new Date()) {
      user.isPremium = false;
      if (user.subscription) user.subscription.plan = 'Free';
      return true;
    }
  }
  return false;
}

function generateToken(user) {
  return jwt.sign(
    { id: user._id || user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/signup', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      epicTag,
      psnId,
      xboxId,
      nintendoId,
      discordId,
      region,
      langPrimary,
      langSecondary,
      hasMic,
      avatarSeed,
      age,
      gender
    } = req.body;

    if (!username || !email || !password || !epicTag || !age || !gender) {
      return res.status(400).json({ error: 'Username, Email, Password, Epic Tag, Age, and Gender are required.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (getIsMongoConnected()) {
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } },
          { epicTag: { $regex: new RegExp(`^${epicTag.trim()}$`, 'i') } }
        ]
      });

      if (existingUser) {
        if (existingUser.email.toLowerCase() === email.toLowerCase()) {
          return res.status(400).json({ error: 'Email is already registered.' });
        }
        if (existingUser.username.toLowerCase() === username.trim().toLowerCase()) {
          return res.status(400).json({ error: 'Username is already registered.' });
        }
        return res.status(400).json({ error: 'This Epic Gamertag is already linked to another account.' });
      }

      const newUser = await User.create({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        epicTag: epicTag.trim(),
        psnId: psnId?.trim() || '',
        xboxId: xboxId?.trim() || '',
        nintendoId: nintendoId?.trim() || '',
        discordId: discordId?.trim() || '',
        region: region || 'NA-East',
        langPrimary: langPrimary || 'English',
        langSecondary: langSecondary || 'None',
        hasMic: hasMic !== false,
        avatarSeed: avatarSeed || username.trim(),
        age: parseInt(age, 10),
        gender: gender,
        isPremium: false,
        subscription: {
          plan: 'Free',
          startDate: null,
          endDate: null,
          history: []
        },
        lastPostDate: null
      });

      sendWelcomeEmail(email.toLowerCase().trim(), username.trim()).catch(e => console.warn('Welcome email error:', e));

      const token = generateToken(newUser);
      const userObj = newUser.toObject();
      delete userObj.password;

      return res.status(201).json({ token, user: userObj });
    } else {
      const db = getFallbackDb();
      const existingEmail = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingEmail) return res.status(400).json({ error: 'Email is already registered.' });

      const existingUsername = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (existingUsername) return res.status(400).json({ error: 'Username is already registered.' });

      const existingEpic = db.users.find(u => u.epicTag.toLowerCase() === epicTag.trim().toLowerCase());
      if (existingEpic) return res.status(400).json({ error: 'This Epic Gamertag is already linked to another account.' });

      const newUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        _id: `user-${Date.now()}`,
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        epicTag: epicTag.trim(),
        psnId: psnId?.trim() || '',
        xboxId: xboxId?.trim() || '',
        nintendoId: nintendoId?.trim() || '',
        discordId: discordId?.trim() || '',
        region: region || 'NA-East',
        langPrimary: langPrimary || 'English',
        langSecondary: langSecondary || 'None',
        hasMic: hasMic !== false,
        avatarSeed: avatarSeed || username.trim(),
        age: parseInt(age, 10),
        gender: gender,
        isPremium: false,
        subscription: {
          plan: 'Free',
          startDate: null,
          endDate: null,
          history: []
        },
        lastPostDate: null,
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      saveFallbackDb();

      sendWelcomeEmail(email.toLowerCase().trim(), username.trim()).catch(e => console.warn('Welcome email error:', e));

      const token = generateToken(newUser);
      const { password: _, ...userObj } = newUser;

      return res.status(201).json({ token, user: userObj });
    }
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during signup' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { loginOrEmail, password } = req.body;

    if (!loginOrEmail || !password) {
      return res.status(400).json({ error: 'Please provide your Username/Email and Password.' });
    }

    if (getIsMongoConnected()) {
      const user = await User.findOne({
        $or: [
          { email: loginOrEmail.toLowerCase().trim() },
          { username: loginOrEmail.trim() }
        ]
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid username/email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username/email or password.' });
      }

      if (checkSubscriptionExpiry(user)) {
        await user.save();
      }

      const token = generateToken(user);
      const userObj = user.toObject();
      delete userObj.password;

      return res.json({ token, user: userObj });
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u =>
        u.email.toLowerCase() === loginOrEmail.toLowerCase().trim() ||
        u.username.toLowerCase() === loginOrEmail.toLowerCase().trim()
      );

      if (!user) {
        return res.status(401).json({ error: 'Invalid username/email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username/email or password.' });
      }

      if (checkSubscriptionExpiry(user)) {
        saveFallbackDb();
      }

      const token = generateToken(user);
      const { password: _, ...userObj } = user;

      return res.json({ token, user: userObj });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during login' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (getIsMongoConnected()) {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return res.status(404).json({ error: 'User not found.' });
      if (checkSubscriptionExpiry(user)) {
        await user.save();
      }
      const userObj = user.toObject ? user.toObject() : { ...user._doc };
      return res.json({ user: userObj });
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => (u.id === decoded.id || u._id === decoded.id));
      if (!user) return res.status(404).json({ error: 'User not found.' });
      if (checkSubscriptionExpiry(user)) {
        saveFallbackDb();
      }
      const { password: _, ...userObj } = user;
      return res.json({ user: userObj });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const {
      username,
      epicTag,
      psnId,
      xboxId,
      discordId,
      region,
      langPrimary,
      langSecondary,
      hasMic,
      avatarSeed,
      gender,
      currentPassword
    } = req.body;

    if (getIsMongoConnected()) {
      const user = await User.findById(decoded.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      if (username && username.trim() !== user.username) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'You must provide your current password to change your username.' });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Incorrect current password.' });
        }

        const existing = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, 'i') }, _id: { $ne: decoded.id } });
        if (existing) {
          return res.status(400).json({ error: 'Username is already taken.' });
        }
      }

      if (epicTag && epicTag.trim() !== user.epicTag) {
        const existingEpic = await User.findOne({ epicTag: { $regex: new RegExp(`^${epicTag.trim()}$`, 'i') }, _id: { $ne: decoded.id } });
        if (existingEpic) {
          return res.status(400).json({ error: 'This Epic Gamertag is already linked to another account.' });
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        decoded.id,
        {
          ...(username && { username: username.trim() }),
          ...(epicTag && { epicTag: epicTag.trim() }),
          ...(psnId !== undefined && { psnId: psnId.trim() }),
          ...(xboxId !== undefined && { xboxId: xboxId.trim() }),
          ...(nintendoId !== undefined && { nintendoId: nintendoId.trim() }),
          ...(discordId !== undefined && { discordId: discordId.trim() }),
          ...(region && { region }),
          ...(langPrimary && { langPrimary }),
          ...(langSecondary !== undefined && { langSecondary }),
          ...(hasMic !== undefined && { hasMic: Boolean(hasMic) }),
          ...(avatarSeed && { avatarSeed }),
          ...(gender && { gender })
        },
        { new: true }
      ).select('-password');

      return res.json({ user: updatedUser });
    } else {
      const db = getFallbackDb();
      const idx = db.users.findIndex(u => u.id === decoded.id || u._id === decoded.id);
      if (idx === -1) return res.status(404).json({ error: 'User not found.' });

      const user = db.users[idx];

      if (username && username.trim() !== user.username) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'You must provide your current password to change your username.' });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Incorrect current password.' });
        }
        const trimmedUser = username.trim().toLowerCase();
        const existing = db.users.find(u => u.username.toLowerCase() === trimmedUser && u.id !== decoded.id && u._id !== decoded.id);
        if (existing) {
          return res.status(400).json({ error: 'Username is already taken.' });
        }
      }

      if (epicTag && epicTag.trim() !== user.epicTag) {
        const trimmedEpic = epicTag.trim().toLowerCase();
        const existingEpic = db.users.find(u => u.epicTag.toLowerCase() === trimmedEpic && u.id !== decoded.id && u._id !== decoded.id);
        if (existingEpic) {
          return res.status(400).json({ error: 'This Epic Gamertag is already linked to another account.' });
        }
      }

      db.users[idx] = {
        ...db.users[idx],
        ...(username && { username: username.trim() }),
        ...(epicTag && { epicTag: epicTag.trim() }),
        ...(psnId !== undefined && { psnId: psnId.trim() }),
        ...(xboxId !== undefined && { xboxId: xboxId.trim() }),
        ...(nintendoId !== undefined && { nintendoId: nintendoId.trim() }),
        ...(discordId !== undefined && { discordId: discordId.trim() }),
        ...(region && { region }),
        ...(langPrimary && { langPrimary }),
        ...(langSecondary !== undefined && { langSecondary }),
        ...(hasMic !== undefined && { hasMic: Boolean(hasMic) }),
        ...(avatarSeed && { avatarSeed }),
        ...(gender && { gender })
      };

      saveFallbackDb();
      const { password: _, ...userObj } = db.users[idx];
      return res.json({ user: userObj });
    }
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update profile.' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const baseUrl = process.env.FRONTEND_URL || `http://localhost:3000`;

    if (getIsMongoConnected()) {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.json({ message: 'If that email is registered, you will receive a reset link shortly.' });
      }
      user.resetToken = token;
      user.resetTokenExpiry = expiry;
      await user.save();
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (!user) {
        return res.json({ message: 'If that email is registered, you will receive a reset link shortly.' });
      }
      user.resetToken = token;
      user.resetTokenExpiry = expiry.toISOString();
      saveFallbackDb();
    }

    const result = await sendPasswordResetEmail(email, token, baseUrl);

    if (result.devMode) {
      return res.json({
        message: 'If that email is registered, you will receive a reset link shortly.',
        devResetLink: result.resetLink  // Only sent in dev mode
      });
    }

    return res.json({ message: 'If that email is registered, you will receive a reset link shortly.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const now = new Date();

    if (getIsMongoConnected()) {
      const user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: now }
      });
      if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired.' });

      user.password = hashed;
      user.resetToken = null;
      user.resetTokenExpiry = null;
      await user.save();
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => u.resetToken === token && u.resetTokenExpiry && new Date(u.resetTokenExpiry) > now);
      if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired.' });

      user.password = hashed;
      user.resetToken = null;
      user.resetTokenExpiry = null;
      saveFallbackDb();
    }

    return res.json({ message: 'Password reset successfully! You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

export default router;
