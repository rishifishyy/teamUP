import React from 'react';
import { Gamepad2, Plus, User, LogIn, LogOut, Compass, Home, Moon, Sun, Crown, Bell, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

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
  incomingRequestsCount = 0,
  onOpenIncomingRequests
}) {
  const avatarUrl = currentUser
    ? `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.avatarSeed || currentUser.username}&backgroundColor=00b4d8`
    : null;

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
              <Zap size={14} /> Free: {Math.max(0, 2 - ((currentUser.postsCount || 0) + (currentUser.invitesCount || 0)))}/2 left
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

          {currentUser && (
            <button className="btn-icon" style={{ position: 'relative', marginLeft: '0.5rem' }} onClick={onOpenIncomingRequests} title="Incoming Match Requests">
              {incomingRequestsCount > 0 ? (
                <motion.div
                  animate={{ rotate: [0, -15, 15, -15, 15, 0] }}
                  transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.6 }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Bell size={20} color="#ef4444" />
                </motion.div>
              ) : (
                <Bell size={20} />
              )}
              {incomingRequestsCount > 0 && (
                <motion.span 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{
                    position: 'absolute', top: -5, right: -5, background: '#ef4444', color: '#fff',
                    fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  {incomingRequestsCount}
                </motion.span>
              )}
            </button>
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
