import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getFallbackDb, saveFallbackDb, getIsMongoConnected } from '../db.js';
import { User } from '../models/User.js';
import { sendWelcomeEmail, sendPasswordResetEmail, sendAccountUpdateEmail } from '../email.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fortnite_teamup_super_secret_jwt_key_2026_production';

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id || user.id,
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function checkSubscriptionExpiry(user) {
  if (user.isPremium && user.subscription?.endDate) {
    if (new Date() > new Date(user.subscription.endDate)) {
      user.isPremium = false;
      user.subscription.plan = 'Free';
      return true;
    }
  }
  return false;
}

// 1. Sign Up Route (Sends Welcome Email)
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
      return res.status(400).json({ error: 'Please fill in all required fields (Username, Email, Password, Epic Games Tag, Age, Gender).' });
    }

    if (parseInt(age, 10) < 13) {
      return res.status(400).json({ error: 'You must be at least 13 years old to join TeamUP.' });
    }

    if (getIsMongoConnected()) {
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase().trim() },
          { username: username.trim() }
        ]
      });

      if (existingUser) {
        if (existingUser.email.toLowerCase() === email.toLowerCase().trim()) {
          return res.status(400).json({ error: 'An account with this email already exists.' });
        }
        return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
      }

      const existingEpic = await User.findOne({ epicTag: epicTag.trim() });
      if (existingEpic) {
        return res.status(400).json({ error: 'This Epic Games Tag is already linked to an existing account.' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

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
        postsCount: 0,
        invitesCount: 0,
        lastPostDate: null
      });

      sendWelcomeEmail(email.toLowerCase().trim(), username.trim()).catch(e => console.warn('Welcome email error:', e));

      const token = generateToken(newUser);
      const userObj = newUser.toObject();
      delete userObj.password;

      return res.status(201).json({ token, user: userObj });
    } else {
      const db = getFallbackDb();
      const existingUser = db.users.find(u =>
        u.email.toLowerCase() === email.toLowerCase().trim() ||
        u.username.toLowerCase() === username.toLowerCase().trim()
      );

      if (existingUser) {
        if (existingUser.email.toLowerCase() === email.toLowerCase().trim()) {
          return res.status(400).json({ error: 'An account with this email already exists.' });
        }
        return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
      }

      const existingEpic = db.users.find(u => u.epicTag.toLowerCase() === epicTag.toLowerCase().trim());
      if (existingEpic) {
        return res.status(400).json({ error: 'This Epic Games Tag is already linked to an existing account.' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

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
        postsCount: 0,
        invitesCount: 0,
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
      return res.status(401).json({ error: 'Unauthorized. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (getIsMongoConnected()) {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return res.status(404).json({ error: 'User not found.' });

      if (checkSubscriptionExpiry(user)) {
        await user.save();
      }

      return res.json({ user });
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => u.id === decoded.id || u._id === decoded.id);
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

// Update Profile (Sends Security Notification Email on Username or Email update)
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
      email,
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
      gender,
      currentPassword
    } = req.body;

    if (getIsMongoConnected()) {
      const user = await User.findById(decoded.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });

      const isChangingUsername = username && username.trim() !== user.username;
      const isChangingEmail = email && email.toLowerCase().trim() !== user.email.toLowerCase();

      if (isChangingUsername || isChangingEmail) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'You must provide your current password to change your username or email.' });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Incorrect current password.' });
        }
      }

      const oldUsername = user.username;
      const oldEmail = user.email;

      if (isChangingUsername) {
        const existing = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, 'i') }, _id: { $ne: decoded.id } });
        if (existing) {
          return res.status(400).json({ error: 'Username is already taken.' });
        }
      }

      if (isChangingEmail) {
        const existingEmail = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: decoded.id } });
        if (existingEmail) {
          return res.status(400).json({ error: 'This email is already in use by another account.' });
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
          ...(email && { email: email.toLowerCase().trim() }),
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

      // Send Account Security Notification Emails
      if (isChangingUsername) {
        sendAccountUpdateEmail({
          toEmail: user.email,
          username: username.trim(),
          updateType: 'username',
          oldValue: oldUsername,
          newValue: username.trim()
        }).catch(err => console.warn('Account update email error:', err));
      }

      if (isChangingEmail) {
        const newEmail = email.toLowerCase().trim();
        sendAccountUpdateEmail({
          toEmail: oldEmail,
          username: user.username,
          updateType: 'email',
          oldValue: oldEmail,
          newValue: newEmail
        }).catch(err => console.warn('Account update email error:', err));

        sendAccountUpdateEmail({
          toEmail: newEmail,
          username: user.username,
          updateType: 'email',
          oldValue: oldEmail,
          newValue: newEmail
        }).catch(err => console.warn('Account update email error:', err));
      }

      return res.json({ user: updatedUser });
    } else {
      const db = getFallbackDb();
      const idx = db.users.findIndex(u => u.id === decoded.id || u._id === decoded.id);
      if (idx === -1) return res.status(404).json({ error: 'User not found.' });

      const user = db.users[idx];

      const isChangingUsername = username && username.trim() !== user.username;
      const isChangingEmail = email && email.toLowerCase().trim() !== user.email.toLowerCase();

      if (isChangingUsername || isChangingEmail) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'You must provide your current password to change your username or email.' });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Incorrect current password.' });
        }
      }

      const oldUsername = user.username;
      const oldEmail = user.email;

      if (isChangingUsername) {
        const trimmedUser = username.trim().toLowerCase();
        const existing = db.users.find(u => u.username.toLowerCase() === trimmedUser && u.id !== decoded.id && u._id !== decoded.id);
        if (existing) {
          return res.status(400).json({ error: 'Username is already taken.' });
        }
      }

      if (isChangingEmail) {
        const trimmedEmail = email.trim().toLowerCase();
        const existingEmail = db.users.find(u => u.email.toLowerCase() === trimmedEmail && u.id !== decoded.id && u._id !== decoded.id);
        if (existingEmail) {
          return res.status(400).json({ error: 'This email is already in use by another account.' });
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
        ...(email && { email: email.toLowerCase().trim() }),
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

      // Send Account Security Notification Emails
      if (isChangingUsername) {
        sendAccountUpdateEmail({
          toEmail: user.email,
          username: username.trim(),
          updateType: 'username',
          oldValue: oldUsername,
          newValue: username.trim()
        }).catch(err => console.warn('Account update email error:', err));
      }

      if (isChangingEmail) {
        const newEmail = email.toLowerCase().trim();
        sendAccountUpdateEmail({
          toEmail: oldEmail,
          username: user.username,
          updateType: 'email',
          oldValue: oldEmail,
          newValue: newEmail
        }).catch(err => console.warn('Account update email error:', err));

        sendAccountUpdateEmail({
          toEmail: newEmail,
          username: user.username,
          updateType: 'email',
          oldValue: oldEmail,
          newValue: newEmail
        }).catch(err => console.warn('Account update email error:', err));
      }

      const { password: _, ...userObj } = db.users[idx];
      return res.json({ user: userObj });
    }
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: err.message || 'Internal server error while updating profile' });
  }
});

// 2. Request Password Reset (Sends Password Reset Email)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Please enter your registered email address.' });
    }

    const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    if (getIsMongoConnected()) {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.json({ message: 'If an account exists with this email, a reset link will be sent.' });
      }

      user.resetToken = resetToken;
      user.resetTokenExpiry = resetExpires;
      await user.save();

      await sendPasswordResetEmail(user.email, resetToken, user.username);
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (!user) {
        return res.json({ message: 'If an account exists with this email, a reset link will be sent.' });
      }

      user.resetToken = resetToken;
      user.resetTokenExpiry = resetExpires.toISOString();
      saveFallbackDb();

      await sendPasswordResetEmail(user.email, resetToken, user.username);
    }

    res.json({ message: 'If an account exists with this email, a reset link will be sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// Reset Password with Token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    if (getIsMongoConnected()) {
      const user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired password reset link.' });
      }

      user.password = hashedPassword;
      user.resetToken = null;
      user.resetTokenExpiry = null;
      await user.save();

      return res.json({ message: 'Password has been reset successfully! You can now log in.' });
    } else {
      const db = getFallbackDb();
      const user = db.users.find(u =>
        u.resetToken === token &&
        new Date(u.resetTokenExpiry) > new Date()
      );

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired password reset link.' });
      }

      user.password = hashedPassword;
      user.resetToken = null;
      user.resetTokenExpiry = null;
      saveFallbackDb();

      return res.json({ message: 'Password has been reset successfully! You can now log in.' });
    }
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

export default router;
