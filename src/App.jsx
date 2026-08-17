import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import PlayerCard from './components/PlayerCard';
import PostWizard from './components/PostWizard';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import ToastContainer from './components/Toast';
import PremiumModal from './components/PremiumModal';
import SearchWizard from './components/SearchWizard';
import ResetPasswordPage from './components/ResetPasswordPage';
import MatchSuccessModal from './components/MatchSuccessModal';
import IncomingRequestsModal from './components/IncomingRequestsModal';
import { api } from './services/api';
import { rankRequests } from './utils/matcher';
import { Search, UserX, Globe, Trophy, Gamepad2, Mic, Languages, Plus, RefreshCw } from 'lucide-react';

const DEFAULT_FILTERS = {
  region: 'NA-East',
  mainMode: 'Ranked',
  buildType: 'Build',
  creativeType: 'Box Fight',
  teamSize: 'Duos',
  platform: 'Any',
  langPrimary: 'English',
  langSecondary: 'None',
  mic: 'Yes'
};

const resetToken = new URLSearchParams(window.location.search).get('token');
const isResetPage = window.location.pathname === '/reset-password' && resetToken;

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'finder'
  const [currentUser, setCurrentUser] = useState(null);

  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('teamup_filters');
      return saved ? JSON.parse(saved) : DEFAULT_FILTERS;
    } catch {
      return DEFAULT_FILTERS;
    }
  });

  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('signup');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchModalData, setMatchModalData] = useState(null);
  const [pendingMatchTarget, setPendingMatchTarget] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('teamup_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('teamup_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    loadUser();
    fetchRequests();
    const interval = setInterval(fetchRequests, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const loadUser = async () => {
    const token = localStorage.getItem('teamup_token');
    if (!token) return; // No need to fetch if no token

    const user = await api.getMe();
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('teamup_user_profile', JSON.stringify(user));
    } else {
      localStorage.removeItem('teamup_token');
      localStorage.removeItem('teamup_user_profile');
      setCurrentUser(null);
    }
  };

  const fetchRequests = async () => {
    try {
      const data = await api.getRequests();
      setRequests(data);
      
      if (localStorage.getItem('teamup_token')) {
        const incoming = await api.getIncomingRequests();
        setIncomingRequests(incoming);
        
        const acceptedRes = await api.getAcceptedMatches();
        if (acceptedRes && acceptedRes.hasAcceptedMatch) {
          setMatchModalData(acceptedRes);
          setIsMatchModalOpen(true);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    let channel;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('teamup_requests_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'SYNC_REQUESTS') {
          setRequests(event.data.requests);
        }
      };
    }
    return () => {
      if (channel) channel.close();
    };
  }, []);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  const handleAuthSuccess = async (mode, data) => {
    let result;
    if (mode === 'signup') {
      result = await api.signup(data);
      showToast(`🎉 Welcome to TeamUP, ${result.user.username}!`, 'success');
    } else {
      result = await api.login(data.loginOrEmail, data.password);
      showToast(`Welcome back, ${result.user.username}!`, 'success');
    }

    if (result?.token) {
      localStorage.setItem('teamup_token', result.token);
    }
    if (result?.user) {
      setCurrentUser(result.user);
      localStorage.setItem('teamup_user_profile', JSON.stringify(result.user));

      if (result.user.region) {
        setFilters(prev => ({ ...prev, region: result.user.region, langPrimary: result.user.langPrimary || prev.langPrimary }));
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('teamup_token');
    localStorage.removeItem('teamup_user_profile');
    setCurrentUser(null);
    showToast('Logged out successfully', 'info');
  };

  const handleUpdateProfile = async (profileData) => {
    const updated = await api.updateProfile(profileData);
    const merged = { ...currentUser, ...updated };
    setCurrentUser(merged);
    localStorage.setItem('teamup_user_profile', JSON.stringify(merged));
  };

  const handleCreatePost = async (newPost) => {
    try {
      const saved = await api.createRequest({
        ...newPost,
        userId: currentUser?.id || currentUser?._id || `guest-${Date.now()}`,
        isHidden: !!pendingMatchTarget
      });

      const updated = [saved, ...requests.filter(r => (r.id !== saved.id && r._id !== saved._id))];
      setRequests(updated);

      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const channel = new BroadcastChannel('teamup_requests_sync');
          channel.postMessage({ type: 'SYNC_REQUESTS', requests: updated });
          channel.close();
        } catch {}
      }

      setFilters({
        region: newPost.region,
        mainMode: newPost.mainMode,
        buildType: newPost.buildType,
        creativeType: newPost.creativeType,
        teamSize: newPost.teamSize,
        platform: newPost.platform,
        langPrimary: newPost.langPrimary,
        langSecondary: newPost.langSecondary,
        mic: newPost.hasMic ? 'Yes' : 'No'
      });

      setCurrentView('finder');
      setIsPostModalOpen(false);
      
      if (pendingMatchTarget) {
        const targetId = pendingMatchTarget.id || pendingMatchTarget._id;
        try {
          await api.sendMatchRequest(targetId);
          showToast('Request published and Match request sent!', 'success');
        } catch (err) {
          showToast(`Request published, but failed to send match: ${err.message}`, 'warning');
        }
        setPendingMatchTarget(null);
      } else {
        showToast('🎉 Your teammate request is published live!', 'success');
      }
    } catch (err) {
      if (err.message && err.message.includes('Upgrade to Premium')) {
        setIsPostModalOpen(false);
        setIsPremiumModalOpen(true);
      } else {
        showToast(err.message || 'Failed to create post', 'warning');
      }
    }
  };

  const handleDeletePost = async (id) => {
    await api.deleteRequest(id);
    const updated = requests.filter(r => (r.id !== id && r._id !== id));
    setRequests(updated);

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('teamup_requests_sync');
        channel.postMessage({ type: 'SYNC_REQUESTS', requests: updated });
        channel.close();
      } catch {}
    }

    showToast('Teammate request removed', 'info');
  };

  const handleMatchPlayer = async (targetPost) => {
    if (!currentUser) {
      setAuthInitialTab('login');
      setIsAuthModalOpen(true);
      showToast('Please log in to send a teammate request.', 'info');
      return;
    }

    const activePosts = requests.filter(r => r.userId === (currentUser.id || currentUser._id));
    if (activePosts.length === 0) {
      setPendingMatchTarget(targetPost);
      setIsPostModalOpen(true);
      showToast('Please specify what you want to play before sending a request!', 'info');
      return;
    }

    try {
      const targetId = targetPost.id || targetPost._id;
      await api.sendMatchRequest(targetId);
      showToast('Match request sent! Waiting for them to accept.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send request.', 'warning');
    }
  };

  const handleAcceptMatch = async (matchId) => {
    try {
      const res = await api.acceptMatch(matchId);
      setIsIncomingModalOpen(false);
      setMatchModalData(res);
      setIsMatchModalOpen(true);
      fetchRequests(); // Refresh requests and incoming
    } catch (err) {
      showToast(err.message || 'Failed to accept match', 'warning');
    }
  };

  const handleDeclineMatch = async (matchId) => {
    try {
      await api.declineMatch(matchId);
      setIncomingRequests(prev => prev.filter(m => m.id !== matchId && m._id !== matchId));
    } catch (err) {
      showToast('Failed to decline', 'warning');
    }
  };

  const handleCopyGamerTag = (tag) => {
    if (navigator.clipboard) navigator.clipboard.writeText(tag);
    showToast(`Copied Epic Tag: "${tag}"`, 'success');
  };

  const handleCopyPsn = (psn) => {
    if (navigator.clipboard) navigator.clipboard.writeText(psn);
    showToast(`Copied PSN ID: "${psn}"`, 'success');
  };

  const handleCopyXbox = (xbox) => {
    if (navigator.clipboard) navigator.clipboard.writeText(xbox);
    showToast(`Copied Xbox Gamertag: "${xbox}"`, 'success');
  };

  const handleCopyDiscord = (disc) => {
    if (navigator.clipboard) navigator.clipboard.writeText(disc);
    showToast(`Copied Discord: "${disc}"`, 'success');
  };

  const displayResults = useMemo(() => {
    let baseResults = [];
    if (currentView === 'livePool') {
      baseResults = [...requests]
        .filter(r => r.userId !== (currentUser?.id || currentUser?._id))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(req => {
          const modeDesc = req.mainMode === 'Creative'
              ? `Creative (${req.creativeType}) • ${req.teamSize}`
              : `${req.mainMode} (${req.buildType}) • ${req.teamSize}`;
          return {
            ...req,
            matchTags: [
              { text: req.region, matched: false, icon: 'Globe' },
              { text: modeDesc, matched: false, icon: 'Trophy' },
              { text: req.platform, matched: false, icon: 'Gamepad2' },
              { text: req.langPrimary, matched: false, icon: 'Languages' },
              { text: req.hasMic ? 'Mic' : 'No Mic', matched: false, icon: req.hasMic ? 'Mic' : 'MicOff', isMic: true }
            ],
            matchScore: 0,
            isPerfectMatch: false
          };
        });
    } else {
      baseResults = rankRequests(requests, filters, currentUser);
    }

    if (!searchQuery.trim()) return baseResults;
    const q = searchQuery.trim().toLowerCase();
    return baseResults.filter(r =>
      (r.epicTag && r.epicTag.toLowerCase().includes(q)) ||
      (r.gamertag && r.gamertag.toLowerCase().includes(q)) ||
      (r.discordId && r.discordId.toLowerCase().includes(q)) ||
      (r.psnId && r.psnId.toLowerCase().includes(q)) ||
      (r.xboxId && r.xboxId.toLowerCase().includes(q)) ||
      (r.rank && r.rank.toLowerCase().includes(q)) ||
      (r.note && r.note.toLowerCase().includes(q))
    );
  }, [requests, filters, searchQuery, currentView, currentUser]);

  const modeDescription = filters.mainMode === 'Creative'
    ? `Creative (${filters.creativeType}) • ${filters.teamSize}`
    : `${filters.mainMode} (${filters.buildType}) • ${filters.teamSize}`;

  const langDescription = filters.langSecondary !== 'None'
    ? `${filters.langPrimary} / ${filters.langSecondary}`
    : filters.langPrimary;

  if (isResetPage) {
    return (
      <ResetPasswordPage
        token={resetToken}
        onGoHome={() => {
          window.history.replaceState({}, '', '/');
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="app-root">

      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'finder' && !currentUser) {
            setAuthInitialTab('login');
            setIsAuthModalOpen(true);
            return;
          }
          if (view === 'finder' && currentView !== 'finder') {
            setIsWizardOpen(true);
          } else {
            setCurrentView(view);
          }
        }}
        onOpenPostModal={() => setIsPostModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenPremium={() => setIsPremiumModalOpen(true)}
        incomingRequestsCount={incomingRequests.length}
        onOpenIncomingRequests={() => setIsIncomingModalOpen(true)}
      />

      <AnimatePresence mode="wait">
        {currentView === 'home' ? (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <LandingPage
              onStartFinder={() => {
                setIsWizardOpen(true);
                setCurrentView('finder');
              }}
              onOpenAuthModal={(tab) => {
                setAuthInitialTab(tab);
                setIsAuthModalOpen(true);
              }}
              onOpenPremium={() => setIsPremiumModalOpen(true)}
              currentUser={currentUser}
            />
          </motion.div>
        ) : (
          <motion.div 
            key={currentView}
            className="finder-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
          >
            
            <section className="hero-header">
              <div className="container">
                <h1 className="hero-title">
                  {currentView === 'livePool' ? (
                    <>Live <span className="highlight">Premium Pool</span> 👑</>
                  ) : (
                    <>Fortnite <span className="highlight">Matchmaking Feed</span></>
                  )}
                </h1>
                <p className="hero-desc">
                  {currentView === 'livePool' 
                    ? "Real-time global feed of all recent teammate requests."
                    : "Real-time requests ranked by priority: Server Region > Mode & Build > Platform > Voice Mic > Language."}
                </p>
              </div>
            </section>

          <main className="container" style={{ paddingBottom: '4rem', paddingTop: '1rem' }}>

            <section className="feed">
              
              <div className="feed-header card">
                <div className="feed-header-left">
                  <h2 className="feed-title">
                    {currentView === 'livePool' ? "All Recent Requests" : "Active Teammate Requests"}
                    <span className="badge-count">{displayResults.length}</span>
                  </h2>
                  <p className="feed-subtitle">
                    {currentView === 'livePool' 
                      ? "Showing the most recent queries across the globe." 
                      : <>Prioritizing: <strong>{filters.region}</strong> • <strong>{modeDescription}</strong></>}
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                    {currentView !== 'livePool' && (
                      <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => setIsWizardOpen(true)}>
                        <Search size={14} style={{ marginRight: '0.35rem' }} /> Modify Visual Search
                      </button>
                    )}
                    <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => { showToast('Refreshing feed...', 'info'); fetchRequests(); }}>
                      <RefreshCw size={14} style={{ marginRight: '0.35rem' }} /> Refresh Feed
                    </button>
                  </div>
                </div>

                <div className="feed-header-right">
                  <div className="search-wrap">
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="Search Epic, PSN, Xbox, Discord..."
                      className="search-field"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="active-filter-summary">
                <span>Target:</span>
                <span className="filter-pill-tag"><Globe size={13} /> <strong>{filters.region}</strong></span>
                <span className="filter-pill-tag"><Trophy size={13} /> <strong>{modeDescription}</strong></span>
                <span className="filter-pill-tag"><Gamepad2 size={13} /> <strong>{filters.platform}</strong></span>
                <span className="filter-pill-tag"><Mic size={13} /> <strong>{filters.mic === 'Yes' ? 'Mic Required' : filters.mic === 'No' ? 'No Mic' : 'Any Mic'}</strong></span>
                <span className="filter-pill-tag"><Languages size={13} /> <strong>{langDescription}</strong></span>
              </div>

              {displayResults.length > 0 ? (
                <div className="cards-grid">
                  {displayResults.map(post => (
                    <PlayerCard
                      key={post.id || post._id}
                      post={post}
                      isMyPost={Boolean(currentUser && (post.userId === currentUser.id || post.userId === currentUser._id))}
                      hasIncoming={Boolean(currentUser && (post.userId === currentUser.id || post.userId === currentUser._id) && incomingRequests.length > 0)}
                      onMatchPlayer={handleMatchPlayer}
                      onCopyGamerTag={handleCopyGamerTag}
                      onCopyPsn={handleCopyPsn}
                      onCopyXbox={handleCopyXbox}
                      onCopyDiscord={handleCopyDiscord}
                      onDeletePost={handleDeletePost}
                    />
                  ))}
                </div>
              ) : (
                <div className="card empty-state">
                  <UserX size={44} className="empty-icon" />
                  <h3>No Active Teammates in this Queue Yet</h3>
                  <p>
                    Be the first player to broadcast a request in <strong>{filters.region}</strong> ({modeDescription})!
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setIsPostModalOpen(true)}
                  >
                    <Plus size={16} /> Broadcast Your Teammate Request
                  </button>
                </div>
              )}

            </section>
          </main>
        </motion.div>
      )}
      </AnimatePresence>

      <PostWizard
        isOpen={isPostModalOpen}
        onClose={() => {
          setIsPostModalOpen(false);
          setPendingMatchTarget(null);
        }}
        onSubmitPost={handleCreatePost}
        initialPreferences={filters}
        currentUser={currentUser}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authInitialTab}
        onAuthSuccess={handleAuthSuccess}
        showToast={showToast}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUpdateProfile={handleUpdateProfile}
        onOpenPremium={() => {
          setIsProfileModalOpen(false);
          setIsPremiumModalOpen(true);
        }}
        showToast={showToast}
      />

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        currentUser={currentUser}
        onUpgradeSuccess={() => handleUpdateProfile({ isPremium: true })}
        onOpenAuthModal={(tab) => {
          setIsPremiumModalOpen(false);
          setAuthInitialTab(tab || 'login');
          setIsAuthModalOpen(true);
        }}
        showToast={showToast}
      />

      <SearchWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        currentFilters={filters}
        onComplete={(newFilters) => {
          setFilters(prev => ({ ...prev, ...newFilters }));
          showToast('Filters updated via Wizard!', 'success');
        }}
      />

      <MatchSuccessModal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        matchData={matchModalData}
        onCopy={text => navigator.clipboard && navigator.clipboard.writeText(text)}
        showToast={showToast}
      />

      <IncomingRequestsModal
        isOpen={isIncomingModalOpen}
        onClose={() => setIsIncomingModalOpen(false)}
        requests={incomingRequests}
        onAccept={handleAcceptMatch}
        onDecline={handleDeclineMatch}
      />

      <ToastContainer toasts={toasts} />
    </div>
  );
}
