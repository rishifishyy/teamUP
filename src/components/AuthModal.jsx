import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Mail, User, Gamepad2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess, showToast }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'forgot'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Login form state
  const [loginData, setLoginData] = useState({
    loginOrEmail: '',
    password: ''
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign up form state - Clean and essential
  const [signupData, setSignupData] = useState({
    username: '',
    email: '',
    password: '',
    age: '',
    gender: 'Male',
    epicTag: '',
    avatarSeed: ''
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setShowLoginPassword(false);
    setShowSignupPassword(false);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onAuthSuccess('login', loginData);
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (parseInt(signupData.age, 10) < 13) {
      setError('You must be at least 13 years old to use TeamUP.');
      return;
    }

    if (!signupData.epicTag.trim()) {
      setError('Epic Games Tag is required so teammates can add you in Fortnite.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...signupData,
        avatarSeed: signupData.avatarSeed || signupData.username
      };
      await onAuthSuccess('signup', payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Signup failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword(forgotEmail);
      setForgotSent(true);
      showToast && showToast('Password reset link sent to your email!', 'success');
    } catch (err) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: '480px' }}>
        
        {/* Modal Header */}
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--primary), #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Gamepad2 size={18} />
            </div>
            <h3 className="modal-title">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'signup' && 'Create TeamUP Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher (Login / Signup) */}
        {mode !== 'forgot' && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            padding: '0 1.5rem',
            background: 'var(--bg-card)'
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              style={{
                flex: 1,
                padding: '0.85rem 0',
                border: 'none',
                background: 'none',
                fontWeight: mode === 'login' ? 700 : 500,
                color: mode === 'login' ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: mode === 'login' ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.95rem'
              }}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              style={{
                flex: 1,
                padding: '0.85rem 0',
                border: 'none',
                background: 'none',
                fontWeight: mode === 'signup' ? 700 : 500,
                color: mode === 'signup' ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: mode === 'signup' ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.95rem'
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div style={{
            margin: '1rem 1.5rem 0',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form className="modal-body" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="loginId">
                <User size={14} /> Username or Email *
              </label>
              <input
                id="loginId"
                type="text"
                className="form-input"
                placeholder="e.g. shadow_ninja or name@example.com"
                value={loginData.loginOrEmail}
                onChange={e => setLoginData({ ...loginData, loginOrEmail: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label htmlFor="loginPass" style={{ margin: 0 }}>
                  <Lock size={14} /> Password *
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="loginPass"
                  type={showLoginPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(prev => !prev)}
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
                    padding: '4px',
                    transition: 'color 0.2s'
                  }}
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '1rem 0 0', marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '120px' }}>
                {loading ? 'Logging In...' : 'Log In'}
              </button>
            </div>
          </form>
        )}

        {/* SIGNUP FORM */}
        {mode === 'signup' && (
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
                  placeholder="Age (13+)"
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
              <label htmlFor="signupEpicTag"><Gamepad2 size={14} /> Epic Games Tag *</label>
              <input
                id="signupEpicTag"
                type="text"
                className="form-input"
                placeholder="e.g. NinjaViper99 (Required for Fortnite squad)"
                value={signupData.epicTag}
                onChange={e => setSignupData({ ...signupData, epicTag: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signupPassword"><Lock size={14} /> Password *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="signupPassword"
                  type={showSignupPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Create a secure password"
                  value={signupData.password}
                  onChange={e => setSignupData({ ...signupData, password: e.target.value })}
                  required
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(prev => !prev)}
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
                    padding: '4px',
                    transition: 'color 0.2s'
                  }}
                  title={showSignupPassword ? 'Hide password' : 'Show password'}
                  aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                >
                  {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '1rem 0 0', marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '150px' }}>
                {loading ? 'Creating Account...' : 'Complete Sign Up'}
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form className="modal-body" onSubmit={handleForgotSubmit}>
            {forgotSent ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}>
                  <Mail size={24} />
                </div>
                <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Check Your Inbox</h4>
                <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  If an account exists for <strong>{forgotEmail}</strong>, we have sent a password reset link.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => { setMode('login'); setForgotSent(false); }}
                  style={{ width: '100%' }}
                >
                  Back to Log In
                </button>
              </div>
            ) : (
              <>
                <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Enter your registered email address and we'll send you a link to reset your password.
                </p>
                <div className="form-group">
                  <label htmlFor="forgotEmail"><Mail size={14} /> Registered Email</label>
                  <input
                    id="forgotEmail"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="modal-footer" style={{ padding: '1rem 0 0', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => { setMode('login'); setError(null); }}
                  >
                    Back to Log In
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}

      </div>
    </div>
  );
}
