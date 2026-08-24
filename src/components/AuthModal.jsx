import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Mail, User, Gamepad2, AlertCircle, Eye, EyeOff, KeyRound, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
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

  // OTP Verification state
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const otpInputRefs = useRef([]);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setShowLoginPassword(false);
    setShowSignupPassword(false);
    setIsOtpStep(false);
    setOtpDigits(['', '', '', '', '', '']);
  }, [initialMode, isOpen]);

  // Resend OTP countdown timer
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

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

  // Step 1: Validate Details and Send OTP
  const handleInitiateSignup = async (e) => {
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
      await api.sendRegistrationOtp({
        username: signupData.username.trim(),
        email: signupData.email.toLowerCase().trim(),
        epicTag: signupData.epicTag.trim(),
        age: signupData.age,
        gender: signupData.gender
      });

      setIsOtpStep(true);
      setResendTimer(60);
      setOtpDigits(['', '', '', '', '', '']);
      showToast && showToast(`Verification code sent to ${signupData.email}!`, 'success');
      setTimeout(() => {
        if (otpInputRefs.current[0]) {
          otpInputRefs.current[0].focus();
        }
      }, 100);
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Create Account
  const handleVerifyOtpAndSignup = async (e) => {
    e.preventDefault();
    setError(null);

    const enteredOtp = otpDigits.join('').trim();
    if (enteredOtp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...signupData,
        otp: enteredOtp,
        avatarSeed: signupData.avatarSeed || signupData.username
      };
      await onAuthSuccess('signup', payload);
      onClose();
      showToast && showToast('🎉 Welcome to TeamUP! Account verified successfully.', 'success');
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;
    setError(null);
    setIsResending(true);
    try {
      await api.sendRegistrationOtp({
        username: signupData.username.trim(),
        email: signupData.email.toLowerCase().trim(),
        epicTag: signupData.epicTag.trim(),
        age: signupData.age,
        gender: signupData.gender
      });
      setResendTimer(60);
      setOtpDigits(['', '', '', '', '', '']);
      showToast && showToast(`New code sent to ${signupData.email}!`, 'success');
      if (otpInputRefs.current[0]) {
        otpInputRefs.current[0].focus();
      }
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  // Handle digit input & auto-focus
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0 && otpInputRefs.current[index - 1]) {
      otpInputRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
      const focusIndex = Math.min(pasted.length, 5);
      if (otpInputRefs.current[focusIndex]) {
        otpInputRefs.current[focusIndex].focus();
      }
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
              {isOtpStep ? <KeyRound size={18} /> : <Gamepad2 size={18} />}
            </div>
            <h3 className="modal-title">
              {mode === 'login' && 'Log In to TeamUP'}
              {mode === 'signup' && (isOtpStep ? 'Verify Your Email' : 'Create an Account')}
              {mode === 'forgot' && 'Reset Your Password'}
            </h3>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher (Only visible when not on OTP step) */}
        {!isOtpStep && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)'
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setIsOtpStep(false); }}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: 'none',
                background: mode === 'login' ? 'var(--bg-card)' : 'transparent',
                color: mode === 'login' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: mode === 'login' ? '700' : '500',
                borderBottom: mode === 'login' ? '2px solid var(--primary)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setIsOtpStep(false); }}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: 'none',
                background: mode === 'signup' ? 'var(--bg-card)' : 'transparent',
                color: mode === 'signup' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: mode === 'signup' ? '700' : '500',
                borderBottom: mode === 'signup' ? '2px solid var(--primary)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            margin: '1rem 1.5rem 0',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form className="modal-body" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="loginEmail"><Mail size={14} /> Username or Email</label>
              <input
                id="loginEmail"
                type="text"
                className="form-input"
                placeholder="ShadowViper or you@example.com"
                value={loginData.loginOrEmail}
                onChange={e => setLoginData({ ...loginData, loginOrEmail: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label htmlFor="loginPassword" style={{ margin: 0 }}><Lock size={14} /> Password</label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); setForgotSent(false); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="loginPassword"
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

        {/* SIGNUP FORM - STEP 1: Details */}
        {mode === 'signup' && !isOtpStep && (
          <form className="modal-body" onSubmit={handleInitiateSignup}>
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
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '160px' }}>
                {loading ? 'Sending Code...' : 'Continue with Email →'}
              </button>
            </div>
          </form>
        )}

        {/* SIGNUP FORM - STEP 2: 6-Digit Email OTP Verification */}
        {mode === 'signup' && isOtpStep && (
          <form className="modal-body" onSubmit={handleVerifyOtpAndSignup} style={{ textAlign: 'center' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(124, 58, 237, 0.12)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              color: '#c4b5fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0.5rem auto 1rem'
            }}>
              <Mail size={24} />
            </div>

            <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 800 }}>Enter Verification Code</h4>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              We have sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{signupData.email}</strong>. Enter it below to activate your account.
            </p>

            {/* 6 Digit Input Boxes */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem'
              }}
              onPaste={handleOtpPaste}
            >
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e)}
                  style={{
                    width: '44px',
                    height: '52px',
                    borderRadius: '10px',
                    border: digit ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    textAlign: 'center',
                    fontSize: '1.35rem',
                    fontWeight: '800',
                    color: '#fbbf24',
                    outline: 'none',
                    boxShadow: digit ? '0 0 12px rgba(124, 58, 237, 0.25)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {/* Resend & Back options */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <button
                type="button"
                onClick={() => { setIsOtpStep(false); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <ArrowLeft size={14} /> Edit Details
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || isResending}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendTimer > 0 ? 'var(--text-muted)' : 'var(--primary)',
                  fontWeight: 600,
                  cursor: resendTimer > 0 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <RefreshCw size={13} className={isResending ? 'spin' : ''} />
                {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
              </button>
            </div>

            <div className="modal-footer" style={{ padding: '0', borderTop: 'none' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || otpDigits.join('').length !== 6}
                style={{ width: '100%', padding: '0.8rem', fontSize: '0.96rem', fontWeight: 700 }}
              >
                {loading ? 'Verifying...' : 'Verify & Create Account 🚀'}
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
