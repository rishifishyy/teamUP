import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, User, Mail, Lock, Gamepad2, Sparkles, Crown, Eye, EyeOff } from 'lucide-react';

const AVATAR_PRESETS = [
  'ShadowViper', 'AeroPhantom', 'FrostSniper', 'KitsuneFlow',
  'TitanKing', 'NeonRogue', 'ApexHunter', 'VortexKnight'
];

export default function ProfileModal({ isOpen, onClose, currentUser, onUpdateProfile, onOpenPremium, showToast }) {
  const [form, setForm] = useState({
    username: currentUser?.username || '',
    email: currentUser?.email || '',
    epicTag: currentUser?.epicTag || '',
    avatarSeed: currentUser?.avatarSeed || currentUser?.username || '',
    gender: currentUser?.gender || 'Male',
    currentPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setForm({
        username: currentUser?.username || '',
        email: currentUser?.email || '',
        epicTag: currentUser?.epicTag || '',
        avatarSeed: currentUser?.avatarSeed || currentUser?.username || '',
        gender: currentUser?.gender || 'Male',
        currentPassword: ''
      });
      setShowPassword(false);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const isChangingSensitive =
    (form.username && form.username.trim() !== currentUser.username) ||
    (form.email && form.email.toLowerCase().trim() !== currentUser.email.toLowerCase());

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.epicTag.trim()) {
      showToast('Epic Games Gamertag cannot be empty.', 'warning');
      return;
    }

    if (isChangingSensitive && !form.currentPassword) {
      showToast('Please enter your current password to save changes to your username or email.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await onUpdateProfile(form);
      showToast('Profile updated successfully!', 'success');
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const currentAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${form.avatarSeed}&backgroundColor=00b4d8`;

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: '520px' }}>
        
        {/* Modal Header */}
        <div className="modal-head">
          <h3 className="modal-title">
            <User size={18} /> Gamer Profile &amp; Account Settings
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>

          {/* Membership Tier Banner */}
          <div style={{
            background: currentUser.isPremium
              ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(168, 85, 247, 0.15))'
              : 'var(--bg-surface)',
            border: `1px solid ${currentUser.isPremium ? '#fbbf24' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: currentUser.isPremium ? '#fbbf24' : 'var(--text-main)', fontSize: '0.95rem' }}>
                <Crown size={16} style={{ fill: currentUser.isPremium ? '#fbbf24' : 'none' }} />
                {currentUser.isPremium ? '👑 Premium VIP Member' : 'Free Tier (1 post / 7 days)'}
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {currentUser.isPremium
                  ? `Plan: ${currentUser.subscription?.plan || 'Active'} · Unlimited matching enabled`
                  : 'Upgrade to bypass the 7-day cooldown and post unlimited requests.'}
              </p>
            </div>
            <button
              type="button"
              className={currentUser.isPremium ? 'btn btn-outline' : 'btn btn-primary'}
              onClick={onOpenPremium}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.85rem',
                whiteSpace: 'nowrap',
                borderColor: currentUser.isPremium ? '#fbbf24' : undefined,
                color: currentUser.isPremium ? '#fbbf24' : undefined
              }}
            >
              {currentUser.isPremium ? 'Manage' : '⚡ Upgrade'}
            </button>
          </div>

          {/* Avatar Selector */}
          <div className="profile-avatar-row" style={{ marginBottom: '1.25rem' }}>
            <img src={currentAvatarUrl} alt="Avatar" className="profile-avatar-large" />
            <div className="avatar-picker">
              <label><Sparkles size={13} /> Select Avatar Style</label>
              <div className="avatar-presets-grid">
                {AVATAR_PRESETS.map(seed => (
                  <img
                    key={seed}
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=00b4d8`}
                    alt={seed}
                    className={`avatar-preset-thumb ${form.avatarSeed === seed ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, avatarSeed: seed })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="section-divider">
            <span>Account Details</span>
          </div>

          {/* Username */}
          <div className="form-group">
            <label htmlFor="editUsername"><User size={14} /> Username *</label>
            <input
              id="editUsername"
              type="text"
              className="form-input"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>

          {/* Email & Change Email */}
          <div className="form-group">
            <label htmlFor="editEmail"><Mail size={14} /> Email Address *</label>
            <input
              id="editEmail"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem', fontSize: '0.78rem' }}>
              Used for account recovery and notifications. Must be unique.
            </small>
          </div>

          {/* Password Prompt when Username or Email is edited */}
          <AnimatePresence>
            {isChangingSensitive && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: '0.85rem' }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="form-group"
                style={{
                  background: 'rgba(251, 191, 36, 0.08)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden'
                }}
              >
                <label htmlFor="currentPassword" style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <Lock size={14} /> Current Password (Required to confirm Email/Username change) *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="currentPassword"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter your current password"
                    value={form.currentPassword || ''}
                    onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                    required
                    style={{ borderColor: '#f59e0b', paddingRight: '42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px'
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="section-divider">
            <span>Fortnite Profile</span>
          </div>

          <div className="form-row">
            {/* Epic Games Tag */}
            <div className="form-group">
              <label htmlFor="editEpicTag"><Gamepad2 size={14} /> Epic Games Tag *</label>
              <input
                id="editEpicTag"
                type="text"
                className="form-input"
                value={form.epicTag}
                onChange={e => setForm({ ...form, epicTag: e.target.value })}
                required
              />
            </div>

            {/* Gender */}
            <div className="form-group">
              <label htmlFor="editGender">Gender</label>
              <select
                id="editGender"
                className="form-select"
                value={form.gender}
                onChange={e => setForm({ ...form, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Check size={16} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
