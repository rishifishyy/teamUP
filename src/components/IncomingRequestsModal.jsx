import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Gamepad2, AlertCircle, Globe, Trophy, Users, Mic, MessageSquare } from 'lucide-react';
import { formatTimeAgo } from '../utils/timeAgo';

export default function IncomingRequestsModal({ isOpen, onClose, requests, onAccept, onDecline }) {
  if (!isOpen) return null;

  const currentRequest = requests.length > 0 ? requests[0] : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="modal-box"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
      >
        <div className="modal-head">
          <h3 className="modal-title">Incoming Teammate Requests ({requests.length})</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <AnimatePresence mode="wait">
            {currentRequest ? (
              <motion.div
                key={currentRequest.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{
                  width: '72px', height: '72px',
                  borderRadius: '50%', background: '#3b82f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
                }}>
                  <Gamepad2 size={36} color="#fff" />
                </div>
                
                <h4 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                  <strong>{currentRequest.senderEpic || currentRequest.senderName}</strong> wants to team up!
                </h4>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.2rem', fontSize: '0.9rem' }}>
                  They replied to your post for <strong>{currentRequest.postMainMode}</strong>.
                  <br/>
                  <small style={{ opacity: 0.8 }}>Requested {formatTimeAgo(currentRequest.createdAt)} ({new Date(currentRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</small>
                  <br/>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24', fontSize: '0.78rem', fontWeight: 700 }}>
                    ⏱️ Auto-expires after 10 mins
                  </span>
                </p>

                <div style={{ background: 'var(--card-bg-elevated)', padding: '1.1rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <h5 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Sender's Setup</h5>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                    <Gamepad2 size={16} color="var(--primary-color)" /> <span><strong>Platform:</strong> {currentRequest.senderPlatform || 'PC'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                    <Trophy size={16} color="#fbbf24" /> <span><strong>Rank:</strong> {currentRequest.senderRank || 'Diamond'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                    <Globe size={16} color="#10b981" /> <span><strong>Region & Lang:</strong> {currentRequest.senderRegion || 'NA-East'} • {currentRequest.senderLang || 'English'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                    <Mic size={16} color={currentRequest.senderMic === 'Yes' ? '#10b981' : 'var(--text-muted)'} /> <span><strong>Voice Chat:</strong> {currentRequest.senderMic === 'Yes' ? 'Has Mic (Voice)' : 'No Mic'}</span>
                  </div>
                  {currentRequest.senderNote && (
                    <div style={{ marginTop: '0.4rem', padding: '0.65rem 0.85rem', background: 'rgba(59, 130, 246, 0.08)', borderLeft: '3px solid var(--primary-color)', borderRadius: '4px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      "{currentRequest.senderNote}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => onDecline(currentRequest.id)}
                    style={{ flex: 1, padding: '0.75rem' }}
                  >
                    <X size={16} /> Decline
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => onAccept(currentRequest.id)}
                    style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', borderColor: '#10b981' }}
                  >
                    <Check size={16} /> Accept Match
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <AlertCircle size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                <h4>No pending requests</h4>
                <p style={{ color: 'var(--text-secondary)' }}>You've cleared your queue.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
