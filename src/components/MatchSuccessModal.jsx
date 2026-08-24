import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Copy, Gamepad2, MessageSquare, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function MatchSuccessModal({ isOpen, onClose, matchData, onCopy, showToast, onOpenChat }) {
  useEffect(() => {
    if (isOpen && matchData) {
      try {
        const duration = 3000;
        const end = Date.now() + duration;
        
        const fireConfetti = typeof confetti === 'function' ? confetti : (confetti.default || confetti);

        const frame = () => {
          fireConfetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#10b981', '#059669', '#34d399', '#ffffff']
          });
          fireConfetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#10b981', '#059669', '#34d399', '#ffffff']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      } catch (err) {
        console.error('Confetti error:', err);
      }
    }
  }, [isOpen, matchData]);

  if (!isOpen || !matchData) return null;

  const { matchedPlayer } = matchData;

  const copyToClipboard = (text, label) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    showToast && showToast(`Copied ${label}: "${text}"`, 'success');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="modal-box"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        style={{
          maxWidth: '480px',
          border: '2px solid #10b981',
          boxShadow: '0 20px 60px rgba(16, 185, 129, 0.25)'
        }}
      >
        <div className="modal-head" style={{ borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <h3 className="modal-title" style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} style={{ fill: '#10b981' }} /> Match Confirmed!
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ textAlign: 'center', padding: '1.75rem 1.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)'
          }}>
            <Sparkles size={32} color="#fff" />
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.35rem', color: 'var(--text-main)' }}>
            You Matched with <span style={{ color: '#10b981' }}>{matchedPlayer?.epicTag || matchedPlayer?.username}</span>!
          </h2>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
            Both of your requests have been <strong>removed from the matchmaking pool</strong>. We also sent an email notification to them!
          </p>

          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.25rem',
            textAlign: 'left'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
              Add &amp; Party Up in Fortnite:
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-card)', borderRadius: '6px', marginBottom: '0.5rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                <Gamepad2 size={15} style={{ color: 'var(--primary)' }} />
                <span>Epic: <strong>{matchedPlayer?.epicTag}</strong></span>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => copyToClipboard(matchedPlayer?.epicTag, 'Epic Tag')}
              >
                <Copy size={12} /> Copy
              </button>
            </div>

            {matchedPlayer?.discordId && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-card)', borderRadius: '6px', marginBottom: '0.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                  <MessageSquare size={15} style={{ color: '#818cf8' }} />
                  <span>Discord: <strong>{matchedPlayer.discordId}</strong></span>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => copyToClipboard(matchedPlayer.discordId, 'Discord Tag')}
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
            )}

            {matchedPlayer?.psnId && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-card)', borderRadius: '6px', marginBottom: '0.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                  <span>PSN: <strong>{matchedPlayer.psnId}</strong></span>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => copyToClipboard(matchedPlayer.psnId, 'PSN ID')}
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
            )}

            {matchedPlayer?.xboxId && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                  <span>Xbox: <strong>{matchedPlayer.xboxId}</strong></span>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => copyToClipboard(matchedPlayer.xboxId, 'Xbox Tag')}
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            <ShieldCheck size={14} style={{ color: '#10b981' }} /> Real-time instant connection verified
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onClose();
              onOpenChat && onOpenChat();
            }}
            style={{ minWidth: '180px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderColor: '#2563eb', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}
          >
            <MessageSquare size={16} /> Open 15-Min Match Chat 💬
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            style={{ minWidth: '140px', fontWeight: 700 }}
          >
            <Check size={16} /> Ready to Play!
          </button>
        </div>
      </motion.div>
    </div>
  );
}
