import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Clock, AlertTriangle, Copy, Check, Sparkles, PhoneOff, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function MatchChatModal({
  isOpen,
  onClose,
  matchData,
  currentUser,
  showToast,
  onEndChat
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(900); // 15 mins default
  const [isExpired, setIsExpired] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  
  // End chat states
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [partnerEndedAlert, setPartnerEndedAlert] = useState(null);
  const [isEnding, setIsEnding] = useState(false);

  const messagesEndRef = useRef(null);

  const matchId = matchData?.matchId;
  const matchedPlayer = matchData?.matchedPlayer || {};

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Poll for messages and termination
  useEffect(() => {
    if (!isOpen || !matchId) return;

    let isMounted = true;

    const fetchChat = async () => {
      try {
        const res = await api.getChatMessages(matchId);
        if (res && isMounted) {
          setMessages(res.messages || []);
          setRemainingSeconds(res.remainingSeconds);
          setIsExpired(res.isExpired);
          setIsWarning(res.isWarning);

          if (res.isEnded) {
            const myName = currentUser?.username;
            if (res.endedBy && res.endedBy !== myName) {
              setPartnerEndedAlert({ endedBy: res.endedBy });
            } else if (!res.endedBy) {
              setPartnerEndedAlert({ endedBy: 'The other player' });
            }
          }
        }
      } catch {}
    };

    fetchChat();
    const interval = setInterval(fetchChat, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, matchId, currentUser]);

  // Broadcast channel for real-time cross-tab sync
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel('teamup_chat_sync');
    channel.onmessage = (event) => {
      if (event.data?.type === 'MATCH_CHAT_ENDED' && String(event.data?.matchId) === String(matchId)) {
        const myName = currentUser?.username;
        if (event.data.endedBy !== myName) {
          setPartnerEndedAlert({ endedBy: event.data.endedBy || 'The other player' });
        }
      } else if (event.data?.type === 'NEW_CHAT_MESSAGE' && String(event.data?.matchId) === String(matchId)) {
        api.getChatMessages(matchId).then(res => {
          if (res?.messages) setMessages(res.messages);
        }).catch(() => {});
      }
    };

    return () => {
      channel.close();
    };
  }, [matchId, currentUser]);

  // Local 1-second countdown ticker
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          setIsWarning(false);
          return 0;
        }
        if (prev <= 60) {
          setIsWarning(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen || !matchData) return null;

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text || !text.trim() || isSending || isExpired || partnerEndedAlert) return;

    setIsSending(true);
    const currentMyId = String(currentUser?.id || currentUser?._id || 'me');
    const myName = currentUser?.username || 'You';

    try {
      const tempMsg = {
        id: `temp-${Date.now()}`,
        matchId,
        senderId: currentMyId,
        senderName: myName,
        text: text.trim(),
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempMsg]);
      setInputText('');

      const res = await api.sendChatMessage(matchId, text.trim());
      
      if (res?.message) {
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? res.message : m));
      }

      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('teamup_chat_sync');
        channel.postMessage({ type: 'NEW_CHAT_MESSAGE', matchId });
        channel.close();
      }
    } catch (err) {
      if (err.message && err.message.includes('ended')) {
        setPartnerEndedAlert({ endedBy: 'The other player' });
      } else {
        showToast && showToast(err.message || 'Failed to send message', 'warning');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleEndChat = async () => {
    setIsEnding(true);
    try {
      await api.endChatSession(matchId);
      
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('teamup_chat_sync');
        channel.postMessage({
          type: 'MATCH_CHAT_ENDED',
          matchId,
          endedBy: currentUser?.username || 'Teammate'
        });
        channel.close();
      }

      showToast && showToast('Chat session ended.', 'info');
      setShowConfirmEnd(false);
      onEndChat && onEndChat();
      onClose();
    } catch (err) {
      showToast && showToast(err.message || 'Failed to end chat', 'warning');
    } finally {
      setIsEnding(false);
    }
  };

  const handleAcknowledgePartnerEnd = () => {
    setPartnerEndedAlert(null);
    onEndChat && onEndChat();
    onClose();
  };

  const handleCopy = (text, field) => {
    if (!text) return;
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast && showToast(`Copied ${field}: "${text}"`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${matchedPlayer.epicTag || matchedPlayer.username}&backgroundColor=00b4d8`;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.75)' }}
      >
        <motion.div
          className="modal-box"
          initial={{ scale: 0.92, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 30, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            maxWidth: '560px',
            width: '95%',
            height: '620px',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            borderRadius: '20px',
            background: '#0f172a',
            color: '#f8fafc',
            border: isWarning ? '2px solid #ef4444' : '1px solid #334155',
            boxShadow: isWarning ? '0 0 35px rgba(239, 68, 68, 0.45)' : '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1rem 1.25rem',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img
                src={avatarUrl}
                alt="Partner Avatar"
                style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid #9333ea' }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <strong style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 800 }}>
                    {matchedPlayer.username || 'Matched Player'}
                  </strong>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '2px 7px', borderRadius: '10px', fontWeight: '800' }}>
                    Connected
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Epic: <strong style={{ color: '#ffffff' }}>{matchedPlayer.epicTag || matchedPlayer.username}</strong>
                  </span>
                  <button
                    onClick={() => handleCopy(matchedPlayer.epicTag || matchedPlayer.username, 'Epic Tag')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#c084fc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                    title="Copy Epic Tag"
                  >
                    {copiedField === 'Epic Tag' ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Timer Badge, End Chat & Close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  fontWeight: '800',
                  background: isExpired ? 'rgba(239, 68, 68, 0.2)' : isWarning ? 'rgba(239, 68, 68, 0.25)' : 'rgba(147, 51, 234, 0.25)',
                  color: isExpired ? '#ef4444' : isWarning ? '#ef4444' : '#c084fc',
                  border: isExpired || isWarning ? '1px solid #ef4444' : '1px solid #9333ea'
                }}
              >
                <Clock size={13} />
                <span>{isExpired ? 'Expired' : formatTimer(remainingSeconds)}</span>
              </div>

              {/* End Chat Button */}
              {!isExpired && (
                <button
                  type="button"
                  onClick={() => setShowConfirmEnd(true)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '14px',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    cursor: 'pointer'
                  }}
                  title="End Chat Session"
                >
                  <PhoneOff size={13} />
                  <span>End</span>
                </button>
              )}

              <button
                type="button"
                className="modal-close-btn"
                onClick={onClose}
                style={{ padding: '0.35rem', color: '#94a3b8' }}
                title="Minimize / Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* 1-Minute Warning Banner */}
          <AnimatePresence>
            {isWarning && !isExpired && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#ffffff',
                  padding: '0.55rem 1rem',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                }}
              >
                <AlertTriangle size={16} />
                <span>
                  <strong>Closing in &lt; 1 minute!</strong> Add each other on Epic Games before the session ends.
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expired Session Overlay Banner */}
          {isExpired && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.2)',
              borderBottom: '1px solid #ef4444',
              color: '#f87171',
              padding: '0.75rem 1rem',
              fontSize: '0.88rem',
              textAlign: 'center',
              fontWeight: '800'
            }}>
              ⌛ 15-Minute Chat Session Has Ended. See you in the Battle Bus!
            </div>
          )}

          {/* Message Area */}
          <div style={{
            flex: 1,
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            background: '#0b1120'
          }}>
            {/* Intro Welcome Card */}
            <div style={{
              textAlign: 'center',
              padding: '1rem',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '14px',
              marginBottom: '0.5rem'
            }}>
              <Sparkles size={22} style={{ color: '#eab308', margin: '0 auto 0.4rem' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: '#ffffff' }}>
                You matched with {matchedPlayer.username || 'your teammate'}!
              </p>
              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                This private chat room is live for <strong style={{ color: '#ffffff' }}>15 minutes</strong>. You can end the chat anytime.
              </p>
            </div>

            {/* Render Messages */}
            {messages.map((msg, index) => {
              const myId = String(currentUser?.id || currentUser?._id || '');
              const msgSenderId = String(msg.senderId || '');
              const isMe = msgSenderId === myId || (currentUser?.username && msg.senderName === currentUser.username);
              const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

              return (
                <div
                  key={msg.id || index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    alignSelf: isMe ? 'flex-end' : 'flex-start'
                  }}
                >
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '3px', padding: '0 4px', fontWeight: 600 }}>
                    {isMe ? 'You' : msg.senderName} • {timeStr}
                  </span>
                  <div
                    style={{
                      padding: '0.7rem 1.05rem',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMe ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : '#1e293b',
                      color: '#ffffff',
                      border: isMe ? 'none' : '1px solid #334155',
                      fontSize: '0.92rem',
                      lineHeight: 1.45,
                      wordBreak: 'break-word',
                      boxShadow: isMe ? '0 4px 14px rgba(124, 58, 237, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div style={{
            padding: '0.85rem 1.25rem',
            background: '#1e293b',
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <input
              type="text"
              className="form-input"
              placeholder={isExpired ? "Chat session expired" : `Message ${matchedPlayer.username || 'teammate'}...`}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              disabled={isExpired || isSending || Boolean(partnerEndedAlert)}
              maxLength={500}
              style={{
                flex: 1,
                borderRadius: '24px',
                padding: '0.65rem 1.1rem',
                fontSize: '0.9rem',
                background: '#0f172a',
                color: '#ffffff',
                border: '1px solid #475569'
              }}
            />

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSendMessage()}
              disabled={isExpired || isSending || !inputText.trim() || Boolean(partnerEndedAlert)}
              style={{
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: 'linear-gradient(135deg, #9333ea, #7c3aed)',
                borderColor: '#9333ea'
              }}
            >
              <Send size={16} color="#ffffff" />
            </button>
          </div>

          {/* Confirm End Chat Modal Overlay */}
          <AnimatePresence>
            {showConfirmEnd && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.85)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.5rem',
                  zIndex: 40
                }}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 15 }}
                  style={{
                    background: '#1e293b',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    borderRadius: '18px',
                    padding: '1.75rem',
                    maxWidth: '400px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)'
                  }}
                >
                  <PhoneOff size={36} color="#ef4444" style={{ margin: '0 auto 0.75rem' }} />
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#ffffff', fontWeight: '800' }}>
                    End Chat Session?
                  </h4>
                  <p style={{ margin: '0 0 1.25rem', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                    Ending this chat will completely close the session for both you and <strong style={{ color: '#ffffff' }}>{matchedPlayer.username || 'your teammate'}</strong>.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setShowConfirmEnd(false)}
                      disabled={isEnding}
                      style={{ minWidth: '100px', color: '#e2e8f0', borderColor: '#475569' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleEndChat}
                      disabled={isEnding}
                      style={{
                        minWidth: '120px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: '800',
                        padding: '0.6rem 1.1rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                      }}
                    >
                      {isEnding ? 'Ending...' : 'Yes, End Chat'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* POPUP ALERT: When Partner Ends Chat (Crystal Clear UI) */}
          <AnimatePresence>
            {partnerEndedAlert && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.88)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.5rem',
                  zIndex: 50
                }}
              >
                <motion.div
                  initial={{ scale: 0.88, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.88, y: 20 }}
                  style={{
                    background: '#1e293b',
                    border: '2px solid #ef4444',
                    borderRadius: '20px',
                    padding: '2rem 1.75rem',
                    maxWidth: '430px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 0 50px rgba(239, 68, 68, 0.45)'
                  }}
                >
                  <div style={{
                    width: '58px',
                    height: '58px',
                    background: 'rgba(239, 68, 68, 0.18)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.1rem',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
                  }}>
                    <AlertCircle size={32} color="#ef4444" />
                  </div>

                  <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.35rem', color: '#f87171', fontWeight: '900', letterSpacing: '-0.02em' }}>
                    Chat Ended
                  </h3>
                  
                  <p style={{ margin: '0 0 1.6rem', fontSize: '0.98rem', color: '#e2e8f0', lineHeight: 1.55 }}>
                    <strong style={{ color: '#ffffff', fontSize: '1.05rem' }}>"{partnerEndedAlert.endedBy}"</strong> has ended the match chat session.
                  </p>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAcknowledgePartnerEnd}
                    style={{
                      minWidth: '160px',
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      borderColor: '#ef4444',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '0.95rem',
                      padding: '0.65rem 1.5rem',
                      borderRadius: '12px',
                      boxShadow: '0 4px 18px rgba(239, 68, 68, 0.4)'
                    }}
                  >
                    Close Chat
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
