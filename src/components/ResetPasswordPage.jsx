import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';

export default function ResetPasswordPage({ token, onGoHome }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    let s = 0;
    if (newPassword.length >= 6) s++;
    if (newPassword.length >= 10) s++;
    if (/[A-Z]/.test(newPassword)) s++;
    if (/[0-9]/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    setStrength(s);
  }, [newPassword]);

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.resetPassword(token, newPassword);
      setStatus('success');
      setMessage(res.message || 'Password reset successfully!');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main)',
      padding: '2rem'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)'
        }}
      >
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '60px', height: '60px',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Lock size={26} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
            🎮 TeamUP
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {status === 'success' ? 'Password updated!' : 'Set your new password'}
          </p>
        </div>

        {status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center' }}
          >
            <CheckCircle size={52} style={{ color: '#22c55e', margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>
              Password Reset Successful!
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
              You can now log in with your new password.
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={onGoHome}
            >
              Go to Login
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit}>
            
            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px', padding: '0.75rem 1rem',
                  color: '#f87171', fontSize: '0.875rem', marginBottom: '1.25rem'
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                {message}
              </motion.div>
            )}

            <div className="form-group">
              <label htmlFor="rp-new" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <Lock size={14} /> New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="rp-new"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 0 }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {newPassword.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: '4px', borderRadius: '2px',
                        background: i <= strength ? strengthColor : 'var(--border-color)',
                        transition: 'background 0.3s'
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="rp-confirm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <Lock size={14} /> Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="rp-confirm"
                  type={showConfirmPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  style={{
                    paddingRight: '2.5rem',
                    borderColor: confirmPassword && confirmPassword !== newPassword ? '#ef4444' : undefined
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(v => !v)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 0 }}
                  title={showConfirmPass ? "Hide password" : "Show password"}
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.35rem' }}>Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '1.5rem', fontSize: '0.95rem', padding: '0.75rem' }}
            >
              {loading ? 'Resetting...' : '🔐 Reset Password'}
            </button>

            <button
              type="button"
              onClick={onGoHome}
              style={{
                width: '100%', marginTop: '0.75rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-dim)', fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
              }}
            >
              <ArrowLeft size={14} /> Back to TeamUP
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
