import React, { useState } from 'react';
import { X, Lock, Mail, User, Gamepad2, Globe, Languages, Mic, MicOff, LogIn, UserPlus, KeyRound, ArrowLeft } from 'lucide-react';
import { FORTNITE_REGIONS, FORTNITE_LANGUAGES } from './FilterSidebar';
import { api } from '../services/api';

export default function AuthModal({ isOpen, onClose, initialTab = 'signup', onAuthSuccess, showToast }) {
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [forgotView, setForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotDevLink, setForgotDevLink] = useState('');

  const [loginData, setLoginData] = useState({
    loginOrEmail: '',
    password: ''
  });

  const [signupData, setSignupData] = useState({
    username: '',
    email: '',
    password: '',
    epicTag: '',
    psnId: '',
    xboxId: '',
    nintendoId: '',
    discordId: '',
    region: 'NA-East',
    langPrimary: 'English',
    langSecondary: 'None',
    hasMic: true,
    age: '',
    gender: 'Male'
  });

  if (!isOpen) return null;

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.forgotPassword(forgotEmail);
      setForgotSent(true);
      if (res.devResetLink) setForgotDevLink(res.devResetLink);
    } catch (err) {
      showToast(err.message || 'Failed to send reset email', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAuthSuccess('login', loginData);
      onClose();
    } catch (err) {
      showToast(err.message || 'Login failed', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!signupData.epicTag.trim()) {
      showToast('Epic Games Gamertag is required for Fortnite matching', 'warning');
      return;
    }
    setLoading(true);
    try {
      await onAuthSuccess('signup', signupData);
      onClose();
    } catch (err) {
      showToast(err.message || 'Signup failed', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box auth-modal-box" onClick={e => e.stopPropagation()}>
        
        <div className="modal-head">
          <div className="auth-tab-switch">
            <button
              type="button"
              className={`auth-tab-btn ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => setTab('signup')}
            >
              <UserPlus size={16} /> Sign Up
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
              onClick={() => setTab('login')}
            >
              <LogIn size={16} /> Log In
            </button>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {tab === 'login' && !forgotView ? (
          <form className="modal-body" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="loginEmail"><Mail size={14} /> Username or Email</label>
              <input
                id="loginEmail"
                type="text"
                className="form-input"
                placeholder="Enter username or email"
                value={loginData.loginOrEmail}
                onChange={e => setLoginData({ ...loginData, loginOrEmail: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="loginPassword"><Lock size={14} /> Password</label>
              <input
                id="loginPassword"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                required
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => { setForgotView(true); setForgotSent(false); setForgotDevLink(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: 0 }}
              >
                Forgot password?
              </button>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Logging in...' : 'Log In to TeamUP'}
              </button>
            </div>
          </form>
        ) : tab === 'login' && forgotView ? (
          <div className="modal-body">
            {!forgotSent ? (
              <form onSubmit={handleForgotSubmit}>
                <button
                  type="button"
                  onClick={() => setForgotView(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', marginBottom: '1.25rem', padding: 0 }}
                >
                  <ArrowLeft size={14} /> Back to Login
                </button>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  <KeyRound size={16} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                  Reset Password
                </h3>
                <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Enter the email linked to your account. We'll send you a reset link.
                </p>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <Mail size={14} /> Email Address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="your@email.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setForgotView(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Sending...' : '📧 Send Reset Link'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📬</div>
                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)', fontWeight: 800 }}>Check Your Email</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  If <strong>{forgotEmail}</strong> is registered, a reset link has been sent.
                </p>
                {forgotDevLink && (
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', textAlign: 'left' }}>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>🛠️ DEV MODE — click to reset:</p>
                    <a href={forgotDevLink} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{forgotDevLink}</a>
                  </div>
                )}
                <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => { setForgotView(false); setForgotSent(false); }}>
                  Back to Login
                </button>
              </div>
            )}
          </div>
        ) : (
          <form className="modal-body" onSubmit={handleSignupSubmit}>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="signupUsername"><User size={14} /> Username *</label>
                <input
                  id="signupUsername"
                  type="text"
                  className="form-input"
                  placeholder="e.g. ShadowViper"
                  value={signupData.username}
                  onChange={e => setSignupData({ ...signupData, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="signupEmail"><Mail size={14} /> Email *</label>
                <input
                  id="signupEmail"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={signupData.email}
                  onChange={e => setSignupData({ ...signupData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="signupAge">Age *</label>
                <input
                  id="signupAge"
                  type="number"
                  className="form-input"
                  placeholder="Your Age (13+)"
                  min="13"
                  value={signupData.age}
                  onChange={e => setSignupData({ ...signupData, age: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="signupGender">Gender *</label>
                <select
                  id="signupGender"
                  className="form-select"
                  value={signupData.gender}
                  onChange={e => setSignupData({ ...signupData, gender: e.target.value })}
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="signupPassword"><Lock size={14} /> Password *</label>
              <input
                id="signupPassword"
                type="password"
                className="form-input"
                placeholder="Create a secure password"
                value={signupData.password}
                onChange={e => setSignupData({ ...signupData, password: e.target.value })}
                required
              />
            </div>

            <div className="section-divider">
              <span>Fortnite &amp; Gamer IDs</span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="signupEpicTag"><Gamepad2 size={14} /> Epic Games Tag *</label>
                <input
                  id="signupEpicTag"
                  type="text"
                  className="form-input"
                  placeholder="e.g. NinjaViper99"
                  value={signupData.epicTag}
                  onChange={e => setSignupData({ ...signupData, epicTag: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="signupDiscord">Discord Username (Optional)</label>
                <input
                  id="signupDiscord"
                  type="text"
                  className="form-input"
                  placeholder="e.g. viper#0001 or viper_gg"
                  value={signupData.discordId}
                  onChange={e => setSignupData({ ...signupData, discordId: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="signupPsn">PlayStation PSN ID (Optional)</label>
                <input
                  id="signupPsn"
                  type="text"
                  className="form-input"
                  placeholder="PSN Gamertag"
                  value={signupData.psnId}
                  onChange={e => setSignupData({ ...signupData, psnId: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="signupXbox">Xbox Gamertag (Optional)</label>
                <input
                  id="signupXbox"
                  type="text"
                  className="form-input"
                  placeholder="Xbox Gamertag"
                  value={signupData.xboxId}
                  onChange={e => setSignupData({ ...signupData, xboxId: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="signupNintendo">Nintendo ID (Optional)</label>
                <input
                  id="signupNintendo"
                  type="text"
                  className="form-input"
                  placeholder="Nintendo ID"
                  value={signupData.nintendoId}
                  onChange={e => setSignupData({ ...signupData, nintendoId: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="signupRegion"><Globe size={14} /> Primary Server Region</label>
                <select
                  id="signupRegion"
                  className="form-select"
                  value={signupData.region}
                  onChange={e => setSignupData({ ...signupData, region: e.target.value })}
                >
                  {FORTNITE_REGIONS.map(reg => (
                    <option key={reg.value} value={reg.value}>{reg.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="signupLang"><Languages size={14} /> Primary Language</label>
                <select
                  id="signupLang"
                  className="form-select"
                  value={signupData.langPrimary}
                  onChange={e => setSignupData({ ...signupData, langPrimary: e.target.value })}
                >
                  {FORTNITE_LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Microphone Status</label>
              <div className="button-group">
                <button
                  type="button"
                  className={`btn-toggle ${signupData.hasMic ? 'active' : ''}`}
                  onClick={() => setSignupData({ ...signupData, hasMic: true })}
                >
                  <Mic size={14} style={{ display: 'inline', marginRight: 4 }} /> Have Mic
                </button>
                <button
                  type="button"
                  className={`btn-toggle ${!signupData.hasMic ? 'active' : ''}`}
                  onClick={() => setSignupData({ ...signupData, hasMic: false })}
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
                {loading ? 'Creating Profile...' : 'Complete Sign Up'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
