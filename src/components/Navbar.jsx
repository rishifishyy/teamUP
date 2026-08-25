import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, Plus, User, LogIn, LogOut, Compass, Home, Moon, Sun, Crown, Bell, Zap, X, CheckCircle2, Clock, AlertCircle, Trash2, BellOff, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({
  currentView,
  onNavigate,
  onOpenPostModal,
  onOpenAuthModal,
  onOpenProfileModal,
  currentUser,
  onLogout,
  theme,
  onToggleTheme,
  onOpenPremium,
  notifications = { totalCount: 0, incoming: [], declined: [], accepted: null },
  onOpenIncomingRequests,
  onOpenAcceptedMatch,
  onClearNotifications,
  onDismissNotification
}) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const avatarUrl = currentUser
    ? `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.avatarSeed || currentUser.username}&backgroundColor=00b4d8`
    : null;

  const totalNotifs = notifications.totalCount || 0;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

  const freePassesLeft = currentUser
    ? Math.max(0, 2 - ((currentUser.postsCount || 0) + (currentUser.invitesCount || 0)))
    : 2;

  return (
    <header className="navbar">
      <div className="container nav-container">

        <div className="brand-logo" onClick={() => onNavigate('home')}>
          <div className="logo-icon">
            <Gamepad2 size={22} />
          </div>
          <div className="logo-text">
            <span className="brand-name">Team<span>UP</span></span>
            <span className="brand-badge">FORTNITE LFG</span>
          </div>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-link ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            <Home size={15} /> Home
          </button>
          <button
            className={`nav-link ${currentView === 'livePool' || currentView === 'finder' ? 'active' : ''}`}
            onClick={() => onNavigate('livePool')}
            style={{
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--primary-color)'
            }}
          >
            <Zap size={16} style={{ fill: 'currentColor' }} /> Launch Live Pool
          </button>
        </nav>

        <div className="nav-actions">
          <button className="btn-icon" onClick={onToggleTheme} title="Toggle Theme" style={{ marginRight: '0.25rem' }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {currentUser?.isPremium ? (
            <button 
              className="btn btn-outline" 
              onClick={onOpenPremium}
              title="VIP Member"
              style={{
                color: '#fbbf24',
                borderColor: '#fbbf24',
                background: 'rgba(251, 191, 36, 0.12)',
                fontWeight: 700,
                padding: '0.45rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Crown size={15} style={{ fill: '#fbbf24' }} /> VIP
            </button>
          ) : currentUser ? (
            <button 
              className="btn btn-outline" 
              onClick={onOpenPremium}
              title="Upgrade to VIP"
              style={{
                color: '#eab308',
                borderColor: '#eab308',
                background: 'rgba(234, 179, 8, 0.08)',
                fontWeight: 700,
                padding: '0.45rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem'
              }}
            >
              <Zap size={14} /> Free: {freePassesLeft}/2 left
            </button>
          ) : (
            <button 
              className="btn btn-outline" 
              onClick={onOpenPremium}
              style={{
                color: '#eab308',
                borderColor: '#eab308',
                background: 'rgba(234, 179, 8, 0.08)',
                fontWeight: 700,
                padding: '0.45rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Crown size={15} /> VIP
            </button>
          )}

          {/* Notification Center Bell & Dropdown */}
          {currentUser && (
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                className="btn-icon"
                style={{
                  position: 'relative',
                  marginLeft: '0.5rem',
                  background: isNotifOpen ? 'var(--bg-secondary)' : undefined
                }}
                onClick={() => setIsNotifOpen(prev => !prev)}
                title="Notifications"
              >
                {totalNotifs > 0 ? (
                  <motion.div
                    animate={{ rotate: [0, -12, 12, -12, 12, 0] }}
                    transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Bell size={20} color="#ef4444" />
                  </motion.div>
                ) : (
                  <Bell size={20} />
                )}
                {totalNotifs > 0 && (
                  <motion.span 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{
                      position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff',
                      fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)'
                    }}
                  >
                    {totalNotifs}
                  </motion.span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 10px)',
                      right: 0,
                      width: '340px',
                      maxWidth: '92vw',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
                      zIndex: 1100,
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1.1rem',
                      borderBottom: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Bell size={16} color="var(--primary)" />
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          Notifications
                        </span>
                        {totalNotifs > 0 && (
                          <span style={{
                            background: 'var(--primary)',
                            color: '#fff',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '8px'
                          }}>
                            {totalNotifs}
                          </span>
                        )}
                      </div>

                      {(notifications.declined?.length > 0 || notifications.accepted) && (
                        <button
                          type="button"
                          onClick={() => {
                            onClearNotifications && onClearNotifications();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                          title="Clear all declined notifications"
                        >
                          <Trash2 size={12} /> Clear All
                        </button>
                      )}
                    </div>

                    {/* Notification Items List */}
                    <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '0.5rem' }}>

                      {/* 1. Accepted Matches */}
                      {notifications.accepted && (
                        <div
                          onClick={() => {
                            setIsNotifOpen(false);
                            onOpenAcceptedMatch && onOpenAcceptedMatch();
                          }}
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: '10px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            marginBottom: '0.5rem',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <CheckCircle2 size={15} color="#10b981" />
                              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#10b981' }}>
                                Match Accepted!
                              </span>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                            {notifications.accepted.subtitle || `${notifications.accepted.matchedPlayer} accepted your invite!`}
                          </p>
                          <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MessageSquare size={12} /> Click to Open Live Chat
                          </div>
                        </div>
                      )}

                      {/* 2. Incoming Invites (Click opens IncomingRequestsModal) */}
                      {notifications.incoming?.map((inc) => (
                        <div
                          key={inc.id}
                          onClick={() => {
                            setIsNotifOpen(false);
                            onOpenIncomingRequests && onOpenIncomingRequests();
                          }}
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: '10px',
                            background: 'rgba(124, 58, 237, 0.08)',
                            border: '1px solid rgba(124, 58, 237, 0.25)',
                            marginBottom: '0.5rem',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Gamepad2 size={15} color="#8b5cf6" />
                              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                Match Invite: {inc.senderName}
                              </span>
                            </div>
                            <span style={{
                              fontSize: '0.68rem',
                              color: '#fbbf24',
                              background: 'rgba(251, 191, 36, 0.15)',
                              padding: '2px 5px',
                              borderRadius: '4px',
                              fontWeight: 700
                            }}>
                              Expires in 10m
                            </span>
                          </div>
                          <p style={{ margin: '0 0 4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {inc.subtitle || `${inc.postMode}`}
                          </p>
                          <span style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 700 }}>
                            👉 Click to View & Respond
                          </span>
                        </div>
                      ))}

                      {/* 3. Declined / Expired Invites */}
                      {notifications.declined?.map((dec) => {
                        const isExpired = dec.type === 'invite_expired' || dec.reason === 'expired_10m';
                        return (
                          <div
                            key={dec.id}
                            style={{
                              padding: '0.7rem 0.85rem',
                              borderRadius: '10px',
                              background: isExpired ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                              border: isExpired ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                              marginBottom: '0.5rem',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {isExpired ? <Clock size={14} color="#f59e0b" /> : <AlertCircle size={14} color="#ef4444" />}
                                <span style={{ fontWeight: 800, fontSize: '0.82rem', color: isExpired ? '#f59e0b' : '#ef4444' }}>
                                  {dec.title}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDismissNotification && onDismissNotification(dec.id);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--text-dim)',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Dismiss notification"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                              {dec.subtitle}
                            </p>
                          </div>
                        );
                      })}

                      {/* Empty State */}
                      {totalNotifs === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)' }}>
                          <BellOff size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            No new notifications
                          </p>
                          <span style={{ fontSize: '0.75rem' }}>You're all caught up! 🎮</span>
                        </div>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {currentUser ? (
            <div className="user-nav-dropdown">
              <button className="user-profile-pill" onClick={onOpenProfileModal} title="Edit Profile & IDs">
                <img src={avatarUrl} alt="Avatar" className="nav-avatar" />
                <span className="nav-user-name">{currentUser.username}</span>
                {currentUser.isPremium && <Crown size={12} style={{ color: '#fbbf24', fill: '#fbbf24', marginLeft: 4 }} />}
              </button>
              <button className="btn-icon" onClick={onLogout} title="Log Out">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button className="btn btn-outline" onClick={() => onOpenAuthModal('login')}>
              <LogIn size={16} /> Sign In
            </button>
          )}
        </div>

      </div>
    </header>
  );
}

