import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, User, Gamepad2, Globe, Languages, Mic, MicOff, Sparkles, Crown } from 'lucide-react';
import { FORTNITE_REGIONS, FORTNITE_LANGUAGES } from './FilterSidebar';

const AVATAR_PRESETS = [
  'ShadowViper', 'AeroPhantom', 'FrostSniper', 'KitsuneFlow',
  'TitanKing', 'NeonRogue', 'ApexHunter', 'VortexKnight'
];

export default function ProfileModal({ isOpen, onClose, currentUser, onUpdateProfile, onOpenPremium, showToast }) {
  const [form, setForm] = useState({
    username: currentUser?.username || '',
    epicTag: currentUser?.epicTag || '',
    psnId: currentUser?.psnId || '',
    xboxId: currentUser?.xboxId || '',
    discordId: currentUser?.discordId || '',
    nintendoId: currentUser?.nintendoId || '',
    region: currentUser?.region || 'NA-East',
    langPrimary: currentUser?.langPrimary || 'English',
    langSecondary: currentUser?.langSecondary || 'None',
    hasMic: currentUser?.hasMic !== false,
    avatarSeed: currentUser?.avatarSeed || currentUser?.username || '',
    gender: currentUser?.gender || 'Male'
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setForm({
        username: currentUser?.username || '',
        epicTag: currentUser?.epicTag || '',
        psnId: currentUser?.psnId || '',
        xboxId: currentUser?.xboxId || '',
        discordId: currentUser?.discordId || '',
        region: currentUser?.region || 'NA-East',
        langPrimary: currentUser?.langPrimary || 'English',
        langSecondary: currentUser?.langSecondary || 'None',
        hasMic: currentUser?.hasMic !== false,
        avatarSeed: currentUser?.avatarSeed || currentUser?.username || '',
        gender: currentUser?.gender || 'Male'
      });
    }
  }, [currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.epicTag.trim()) {
      showToast('Epic Games Gamertag cannot be empty.', 'warning');
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title">
            <User size={18} /> Gamer Profile &amp; Linked IDs
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>

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

          <div className="profile-avatar-row">
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
            <span>Account Settings</span>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="editUsername"><User size={14} /> Username *</label>
            <input
              id="editUsername"
              type="text"
              className="form-input"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem' }}>
              Your unique identity on TeamUP. Must be unique across all users.
            </small>
            
            <AnimatePresence>
              {form.username && form.username !== currentUser?.username && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="form-group"
                  style={{ overflow: 'hidden' }}
                >
                  <label htmlFor="currentPassword" style={{ color: '#fbbf24' }}>Current Password (Required for Username change) *</label>
                  <input
                    id="currentPassword"
                    type="password"
                    className="form-input"
                    value={form.currentPassword || ''}
                    onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                    required
                    style={{ borderColor: 'rgba(251, 191, 36, 0.4)' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="section-divider">
            <span>Linked Gamertags &amp; Socials</span>
          </div>

          <div className="form-row">
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

            <div className="form-group">
              <label htmlFor="editDiscord">Discord Username</label>
              <input
                id="editDiscord"
                type="text"
                className="form-input"
                placeholder="e.g. viper#0001"
                value={form.discordId}
                onChange={e => setForm({ ...form, discordId: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="editPsn">PlayStation Network (PSN ID)</label>
              <input
                id="editPsn"
                type="text"
                className="form-input"
                placeholder="PSN ID"
                value={form.psnId}
                onChange={e => setForm({ ...form, psnId: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="editXbox">Xbox Gamertag</label>
              <input
                id="editXbox"
                type="text"
                className="form-input"
                placeholder="Xbox Gamertag"
                value={form.xboxId}
                onChange={e => setForm({ ...form, xboxId: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="editNintendo">Nintendo ID</label>
              <input
                id="editNintendo"
                type="text"
                className="form-input"
                placeholder="Nintendo ID"
                value={form.nintendoId}
                onChange={e => setForm({ ...form, nintendoId: e.target.value })}
              />
            </div>
          </div>

          <div className="section-divider">
            <span>Default Matching Preferences</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="editRegion"><Globe size={14} /> Default Server Region</label>
              <select
                id="editRegion"
                className="form-select"
                value={form.region}
                onChange={e => setForm({ ...form, region: e.target.value })}
              >
                {FORTNITE_REGIONS.map(reg => (
                  <option key={reg.value} value={reg.value}>{reg.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="editLang"><Languages size={14} /> Primary Language</label>
              <select
                id="editLang"
                className="form-select"
                value={form.langPrimary}
                onChange={e => setForm({ ...form, langPrimary: e.target.value })}
              >
                {FORTNITE_LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
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

          <div className="form-group">
            <label>Microphone Status</label>
            <div className="button-group">
              <button
                type="button"
                className={`btn-toggle ${form.hasMic ? 'active' : ''}`}
                onClick={() => setForm({ ...form, hasMic: true })}
              >
                <Mic size={14} style={{ display: 'inline', marginRight: 4 }} /> Have Mic
              </button>
              <button
                type="button"
                className={`btn-toggle ${!form.hasMic ? 'active' : ''}`}
                onClick={() => setForm({ ...form, hasMic: false })}
              >
                <MicOff size={14} style={{ display: 'inline', marginRight: 4 }} /> No Mic
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Check size={16} /> {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
