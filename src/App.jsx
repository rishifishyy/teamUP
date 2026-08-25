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
import SendInviteModal from './components/SendInviteModal';
import MatchChatModal from './components/MatchChatModal';
import { api } from './services/api';
import { Search, UserX, Plus, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';

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
const isResetPage = Boolean(resetToken) && (window.location.pathname.startsWith('/reset-password') || window.location.pathname === '/');

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
  const [poolFilters, setPoolFilters] = useState({
    region: 'All',
    mainMode: 'All',
    buildType: 'All',
    platform: 'All'
  });

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('signup');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchModalData, setMatchModalData] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatData, setActiveChatData] = useState(() => {
    try {
      const saved = localStorage.getItem('teamup_active_chat');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [chatEndedAlertData, setChatEndedAlertData] = useState(null);
  const [isSendInviteModalOpen, setIsSendInviteModalOpen] = useState(false);
  const [pendingInviteTarget, setPendingInviteTarget] = useState(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [notifications, setNotifications] = useState({ totalCount: 0, incoming: [], declined: [], accepted: null });
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(() => {
    // Clear legacy dark mode preference
    const legacy = localStorage.getItem('teamup_theme');
    if (legacy === 'dark') {
      localStorage.removeItem('teamup_theme');
    }
    return localStorage.getItem('teamup_theme_v2') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('teamup_theme_v2', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    loadUser();
    fetchRequests();
    const interval = setInterval(fetchRequests, 3000); // Fast 3-second sync
    return () => clearInterval(interval);
  }, []);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('teamup_token');
      if (!token) return;
      const user = await api.getMe();
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('teamup_user_profile', JSON.stringify(user));
      } else {
        localStorage.removeItem('teamup_token');
        localStorage.removeItem('teamup_user_profile');
        setCurrentUser(null);
      }
    } catch {
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
        loadUser();
        const notifs = await api.getNotifications();
        if (notifs) {
          setNotifications(notifs);
          setIncomingRequests(notifs.incoming || []);
          
          if (notifs.accepted) {
            setMatchModalData(notifs.accepted);
            localStorage.setItem('teamup_active_chat', JSON.stringify(notifs.accepted));
            setActiveChatData(notifs.accepted);
          }
        }

        const activeChatRes = await api.getActiveChatSession();
        if (activeChatRes && activeChatRes.hasActiveChat) {
          localStorage.setItem('teamup_active_chat', JSON.stringify(activeChatRes));
          setActiveChatData(activeChatRes);
        } else if (activeChatRes && activeChatRes.isEnded) {
          const endedBy = activeChatRes.endedBy || 'Your teammate';
          const ackKey = `teamup_ack_end_${activeChatRes.matchId}`;
          if (!localStorage.getItem(ackKey)) {
            localStorage.setItem(ackKey, 'true');
            if (currentUser?.username !== endedBy) {
              setChatEndedAlertData({ endedBy });
              showToast(`🛑 Match Chat Ended: "${endedBy}" has ended the chat session.`, 'warning');
            }
          }
          if (!isChatOpen) {
            localStorage.removeItem('teamup_active_chat');
            setActiveChatData(null);
            setHasUnreadChat(false);
          }
        } else if (activeChatRes && activeChatRes.hasActiveChat === false) {
          if (!isChatOpen) {
            localStorage.removeItem('teamup_active_chat');
            setActiveChatData(null);
            setHasUnreadChat(false);
          }
        }
      }
    } catch {}
  };

  const handleClearNotifications = async () => {
    await api.clearNotifications();
    setNotifications(prev => ({
      ...prev,
      declined: [],
      totalCount: (prev.incoming?.length || 0)
    }));
    showToast('Notifications cleared', 'info');
  };

  const handleDismissNotification = async (notifId) => {
    await api.dismissNotification(notifId);
    setNotifications(prev => {
      const nextDeclined = (prev.declined || []).filter(d => d.id !== notifId);
      return {
        ...prev,
        declined: nextDeclined,
        totalCount: (prev.incoming?.length || 0) + nextDeclined.length + (prev.accepted ? 1 : 0)
      };
    });
  };

  useEffect(() => {
    let channel;
    let chatChannel;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('teamup_requests_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'SYNC_REQUESTS') {
          setRequests(event.data.requests);
        } else if (event.data?.type === 'MATCH_ACCEPTED' || event.data?.type === 'MATCH_REQUEST_SENT' || event.data?.type === 'MATCH_DECLINED') {
          fetchRequests();
        }
      };

      chatChannel = new BroadcastChannel('teamup_chat_sync');
      chatChannel.onmessage = (event) => {
        if (event.data?.type === 'NEW_CHAT_MESSAGE') {
          if (!isChatOpen) {
            setHasUnreadChat(true);
          }
        } else if (event.data?.type === 'MATCH_CHAT_ENDED') {
          const endedBy = event.data.endedBy || 'Your teammate';
          if (!isChatOpen) {
            if (currentUser?.username !== endedBy) {
              setChatEndedAlertData({ endedBy });
              showToast(`🛑 Match Chat Ended: "${endedBy}" has ended the chat session.`, 'warning');
            }
            localStorage.removeItem('teamup_active_chat');
            setActiveChatData(null);
            setHasUnreadChat(false);
          }
        }
      };
    }
    return () => {
      if (channel) channel.close();
      if (chatChannel) chatChannel.close();
    };
  }, [isChatOpen, currentUser?.username]);

  const [lastSeenMsgId, setLastSeenMsgId] = useState('');

  // Unread message polling when chat is minimized
  useEffect(() => {
    if (!activeChatData?.matchId || isChatOpen) return;

    const checkMessages = async () => {
      try {
        const res = await api.getChatMessages(activeChatData.matchId);
        if (res) {
          if (res.isEnded) {
            const endedBy = res.endedBy || 'Your teammate';
            const ackKey = `teamup_ack_end_${activeChatData.matchId}`;
            if (!localStorage.getItem(ackKey)) {
              localStorage.setItem(ackKey, 'true');
              if (currentUser?.username !== endedBy) {
                setChatEndedAlertData({ endedBy });
                showToast(`🛑 Match Chat Ended: "${endedBy}" has ended the chat session.`, 'warning');
              }
            }
            localStorage.removeItem('teamup_active_chat');
            setActiveChatData(null);
            setHasUnreadChat(false);
            return;
          }

          if (res.messages && res.messages.length > 0) {
            const partnerMsgs = res.messages.filter(m => m.senderName !== currentUser?.username);
            if (partnerMsgs.length > 0) {
              const latestPartnerMsg = partnerMsgs[partnerMsgs.length - 1];
              if (latestPartnerMsg.id !== lastSeenMsgId && !isChatOpen) {
                setHasUnreadChat(true);
              }
            }
          }
        }
      } catch {}
    };

    checkMessages();
    const interval = setInterval(checkMessages, 1000);

    return () => clearInterval(interval);
  }, [activeChatData?.matchId, isChatOpen, currentUser?.username, lastSeenMsgId]);

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

  const handleOpenPostModal = () => {
    if (!currentUser) {
      setAuthInitialTab('login');
      setIsAuthModalOpen(true);
      showToast('Please log in before broadcasting a teammate request.', 'info');
      return;
    }

    const freeUsed = (currentUser.postsCount || 0) + (currentUser.invitesCount || 0);
    if (!currentUser.isPremium && freeUsed >= 2) {
      showToast('You have used your 2 free requests! Upgrade to VIP for unlimited broadcasts and matching.', 'warning');
      setIsPremiumModalOpen(true);
      return;
    }

    if (currentUser.isPremium) {
      const myActivePost = requests.find(r => r.userId === currentUser.id || r.userId === currentUser._id);
      if (myActivePost) {
        showToast('You already have an active lookup in the pool. Delete your previous lookup or wait for matches before posting another.', 'warning');
        return;
      }
    }

    setIsPostModalOpen(true);
  };

  const handleCreatePost = async (newPost) => {
    if (!currentUser) {
      setIsPostModalOpen(false);
      setAuthInitialTab('login');
      setIsAuthModalOpen(true);
      showToast('Please log in before broadcasting a teammate request.', 'info');
      return;
    }

    const freeUsed = (currentUser.postsCount || 0) + (currentUser.invitesCount || 0);
    if (!currentUser.isPremium && freeUsed >= 2) {
      setIsPostModalOpen(false);
      showToast('You have used your 2 free requests! Upgrade to VIP for unlimited broadcasts and matching.', 'warning');
      setIsPremiumModalOpen(true);
      return;
    }

    const newReqData = {
      ...newPost,
      userId: currentUser?.id || currentUser?._id,
      isHidden: false
    };

    try {
      const created = await api.createRequest(newReqData);
      setIsPostModalOpen(false);
      if (created?.postsCount !== undefined) {
        setCurrentUser(prev => {
          const updated = prev ? { ...prev, postsCount: created.postsCount } : prev;
          if (updated) localStorage.setItem('teamup_user_profile', JSON.stringify(updated));
          return updated;
        });
      }
      showToast('🎉 Your teammate request is now LIVE on the pool!', 'success');
      
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('teamup_requests_sync');
        channel.postMessage({ type: 'SYNC_REQUESTS', requests: [created.request || created, ...requests] });
        channel.close();
      }
      
      fetchRequests();
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('User not found') || msg.includes('Unauthorized') || msg.includes('logged in')) {
        localStorage.removeItem('teamup_token');
        localStorage.removeItem('teamup_user_profile');
        setCurrentUser(null);
        setIsPostModalOpen(false);
        setAuthInitialTab('login');
        setIsAuthModalOpen(true);
        showToast('Session expired or account was reset. Please log in or register.', 'info');
        return;
      }
      if (err.isFreeLimitReached || msg.includes('Free tier') || msg.includes('free requests') || msg.includes('Upgrade to VIP') || msg.includes('403')) {
        setIsPostModalOpen(false);
        setIsPremiumModalOpen(true);
        showToast('Free tier limit reached: You have used your 2 free requests. Upgrade to VIP for unlimited broadcasts!', 'warning');
      } else {
        showToast(msg || 'Failed to publish request.', 'warning');
      }
    }
  };

  const handleMatchPlayer = (targetPost) => {
    if (!currentUser) {
      setAuthInitialTab('login');
      setIsAuthModalOpen(true);
      showToast('Please log in to send a teammate request.', 'info');
      return;
    }

    const freeUsed = (currentUser.postsCount || 0) + (currentUser.invitesCount || 0);
    if (!currentUser.isPremium && freeUsed >= 2) {
      showToast('You have used your 2 free requests! Upgrade to VIP for unlimited broadcasts and matching.', 'warning');
      setIsPremiumModalOpen(true);
      return;
    }

    setPendingInviteTarget(targetPost);
    setIsSendInviteModalOpen(true);
  };

  const handleConfirmSendInvite = async (setupData) => {
    if (!pendingInviteTarget) return;

    const freeUsed = (currentUser?.postsCount || 0) + (currentUser?.invitesCount || 0);
    if (!currentUser?.isPremium && freeUsed >= 2) {
      setIsSendInviteModalOpen(false);
      showToast('You have used your 2 free requests! Upgrade to VIP for unlimited broadcasts and matching.', 'warning');
      setIsPremiumModalOpen(true);
      return;
    }

    try {
      setIsSendingInvite(true);
      const targetId = pendingInviteTarget.id || pendingInviteTarget._id;
      const res = await api.sendMatchRequest(targetId, setupData);
      if (res?.invitesCount !== undefined) {
        setCurrentUser(prev => {
          const updated = prev ? { ...prev, invitesCount: res.invitesCount } : prev;
          if (updated) localStorage.setItem('teamup_user_profile', JSON.stringify(updated));
          return updated;
        });
      }
      setIsSendInviteModalOpen(false);
      showToast('🎉 Match request sent! Waiting for player to accept.', 'success');
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('teamup_requests_sync');
        channel.postMessage({ type: 'MATCH_REQUEST_SENT' });
        channel.close();
      }
      fetchRequests();
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('User not found') || msg.includes('Unauthorized') || msg.includes('logged in')) {
        localStorage.removeItem('teamup_token');
        localStorage.removeItem('teamup_user_profile');
        setCurrentUser(null);
        setIsSendInviteModalOpen(false);
        setAuthInitialTab('login');
        setIsAuthModalOpen(true);
        showToast('Session expired or account was reset. Please log in or register.', 'info');
        return;
      }
      if (err.isFreeLimitReached || msg.includes('Free tier') || msg.includes('free requests') || msg.includes('Upgrade to VIP') || msg.includes('403')) {
        setIsSendInviteModalOpen(false);
        setIsPremiumModalOpen(true);
        showToast('Free tier limit reached: You have used your 2 free requests. Upgrade to VIP for unlimited invites!', 'warning');
      } else {
        showToast(msg || 'Failed to send request.', 'warning');
      }
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleAcceptMatch = async (matchId) => {
    try {
      const res = await api.acceptMatch(matchId);
      setIsIncomingModalOpen(false);
      setMatchModalData(res);
      localStorage.setItem('teamup_active_chat', JSON.stringify(res));
      setActiveChatData(res);
      sessionStorage.setItem(`teamup_seen_match_${res.matchId || matchId}`, 'true');
      setIsMatchModalOpen(true);
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('teamup_requests_sync');
        channel.postMessage({ type: 'MATCH_ACCEPTED' });
        channel.close();
      }
      loadUser();
      fetchRequests(); // Refresh requests, pass count, and incoming
    } catch (err) {
      showToast(err.message || 'Failed to accept match', 'warning');
    }
  };

  const handleCloseMatchModal = () => {
    setIsMatchModalOpen(false);
    if (matchModalData?.matchId) {
      sessionStorage.setItem(`teamup_seen_match_${matchModalData.matchId}`, 'true');
    }
    api.dismissMatch().catch(() => {});
  };

  const handleDeclineMatch = async (matchId) => {
    try {
      await api.declineMatch(matchId);
      setIncomingRequests(prev => prev.filter(m => m.id !== matchId && m._id !== matchId));
      showToast('Request declined', 'info');
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('teamup_requests_sync');
        channel.postMessage({ type: 'MATCH_DECLINED' });
        channel.close();
      }
      fetchRequests();
    } catch {
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
    let baseResults = [...requests].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (poolFilters.region !== 'All') {
      baseResults = baseResults.filter(r => r.region === poolFilters.region);
    }
    if (poolFilters.mainMode !== 'All') {
      baseResults = baseResults.filter(r => r.mainMode === poolFilters.mainMode);
    }
    if (poolFilters.buildType !== 'All') {
      baseResults = baseResults.filter(r => r.buildType === poolFilters.buildType);
    }
    if (poolFilters.platform !== 'All') {
      baseResults = baseResults.filter(r => r.platform === poolFilters.platform || r.platform === 'Any');
    }

    baseResults = baseResults.map(req => {
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
  }, [requests, poolFilters, searchQuery]);

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
        onNavigate={(view) => setCurrentView(view)}
        onOpenPostModal={handleOpenPostModal}
        onOpenAuthModal={(tab) => {
          setAuthInitialTab(tab || 'login');
          setIsAuthModalOpen(true);
        }}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenPremium={() => setIsPremiumModalOpen(true)}
        notifications={notifications}
        onOpenIncomingRequests={() => setIsIncomingModalOpen(true)}
        onOpenAcceptedMatch={() => {
          if (notifications.accepted) {
            setMatchModalData(notifications.accepted);
            setIsMatchModalOpen(true);
          }
        }}
        onClearNotifications={handleClearNotifications}
        onDismissNotification={handleDismissNotification}
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
              onStartFinder={() => setCurrentView('livePool')}
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
            key="livePool"
            className="finder-view"
            initial={{ opacity: 0, y: 25, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0.15 }}
          >
            
            {/* Live Pool Hero Header */}
            <section className="hero-header" style={{ padding: '2.5rem 0 1.5rem', textAlign: 'center' }}>
              <div className="container">
                <motion.div
                  initial={{ y: -12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.35 }}
                >
                  <h1 className="hero-title" style={{ fontSize: '2.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                    Live <span className="highlight">Matchmaking Pool</span> ⚡
                  </h1>
                  <p className="hero-desc" style={{ maxWidth: '640px', margin: '0 auto 1.5rem', color: 'var(--text-secondary)' }}>
                    Real-time teammate requests from active Fortnite players. Send a request or broadcast your own to find a squad immediately.
                  </p>

                  {/* Primary Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleOpenPostModal}
                      style={{
                        padding: '0.75rem 1.6rem',
                        fontSize: '0.96rem',
                        fontWeight: '700',
                        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Plus size={18} /> + Post Teammate Request
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        showToast('Refreshing live feed...', 'info');
                        fetchRequests();
                      }}
                      style={{
                        padding: '0.75rem 1.4rem',
                        fontSize: '0.96rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <RefreshCw size={16} /> Refresh Feed
                    </button>
                  </div>
                </motion.div>
              </div>
            </section>

            <main className="container" style={{ paddingBottom: '4rem', paddingTop: '0.5rem' }}>
              <section className="feed">
                
                {/* Live Pool Control & Quick Filters Card */}
                <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
                  {/* Top Bar: Title & Search Field */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Recent Player Requests
                        <span className="badge-count">{displayResults.length}</span>
                      </h2>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Live requests sorted by newest first
                      </p>
                    </div>

                    <div className="search-wrap" style={{ minWidth: '260px' }}>
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

                  {/* Filter Group: Regions */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                      🌐 Server Region
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {['All', 'NA-East', 'NA-Central', 'NA-West', 'Europe', 'Asia', 'Brazil', 'Oceania', 'Middle East'].map(r => (
                        <button
                          type="button"
                          key={r}
                          onClick={() => setPoolFilters(prev => ({ ...prev, region: r }))}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '20px',
                            border: poolFilters.region === r ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                            background: poolFilters.region === r ? 'rgba(59, 130, 246, 0.15)' : 'var(--input-bg)',
                            color: poolFilters.region === r ? 'var(--primary-color)' : 'var(--text-primary)',
                            fontWeight: poolFilters.region === r ? '700' : '500',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {r === 'All' ? 'All Regions' : r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filter Group: Game Mode & Build Mode */}
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                        🏆 Mode
                      </span>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {['All', 'Ranked', 'Unranked', 'Creative'].map(m => (
                          <button
                            type="button"
                            key={m}
                            onClick={() => setPoolFilters(prev => ({ ...prev, mainMode: m }))}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '20px',
                              border: poolFilters.mainMode === m ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                              background: poolFilters.mainMode === m ? 'rgba(59, 130, 246, 0.15)' : 'var(--input-bg)',
                              color: poolFilters.mainMode === m ? 'var(--primary-color)' : 'var(--text-primary)',
                              fontWeight: poolFilters.mainMode === m ? '700' : '500',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {m === 'All' ? 'All Modes' : m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                        🧱 Build Setting
                      </span>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {['All', 'Build', 'Zero Build'].map(b => (
                          <button
                            type="button"
                            key={b}
                            onClick={() => setPoolFilters(prev => ({ ...prev, buildType: b }))}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '20px',
                              border: poolFilters.buildType === b ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                              background: poolFilters.buildType === b ? 'rgba(59, 130, 246, 0.15)' : 'var(--input-bg)',
                              color: poolFilters.buildType === b ? 'var(--primary-color)' : 'var(--text-primary)',
                              fontWeight: poolFilters.buildType === b ? '700' : '500',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {b === 'All' ? 'All Builds' : b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feed Cards Grid */}
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
                  <div className="card empty-state" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                    <UserX size={48} className="empty-icon" style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
                    <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>No Active Requests in this Queue</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
                      Be the first player to broadcast a request to the live pool!
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleOpenPostModal}
                      style={{ padding: '0.75rem 1.5rem' }}
                    >
                      <Plus size={16} /> + Post Teammate Request
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
        onClose={() => setIsPostModalOpen(false)}
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
        onClose={handleCloseMatchModal}
        matchData={matchModalData}
        onCopy={text => navigator.clipboard && navigator.clipboard.writeText(text)}
        showToast={showToast}
        onOpenChat={() => {
          handleCloseMatchModal();
          setIsChatOpen(true);
        }}
      />

      {/* Floating Active Match Chat Button (15-min Session) with Shake Animation */}
      {activeChatData && !isChatOpen && (
        <button
          type="button"
          className={hasUnreadChat ? 'chat-floating-shake' : ''}
          onClick={async () => {
            try {
              const res = await api.getChatMessages(activeChatData.matchId);
              if (res?.messages?.length) {
                const partnerMsgs = res.messages.filter(m => m.senderName !== currentUser?.username);
                if (partnerMsgs.length) {
                  setLastSeenMsgId(partnerMsgs[partnerMsgs.length - 1].id);
                }
              }
            } catch {}
            setHasUnreadChat(false);
            setIsChatOpen(true);
          }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1050,
            padding: '0.75rem 1.25rem',
            borderRadius: '30px',
            background: hasUnreadChat
              ? 'linear-gradient(135deg, #dc2626, #ef4444)'
              : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#fff',
            border: hasUnreadChat
              ? '2px solid rgba(255, 255, 255, 0.8)'
              : '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: hasUnreadChat
              ? '0 0 35px rgba(239, 68, 68, 0.95), 0 8px 30px rgba(0, 0, 0, 0.5)'
              : '0 8px 30px rgba(37, 99, 235, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            fontWeight: '800',
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'background 0.2s, box-shadow 0.2s'
          }}
        >
          <MessageSquare size={18} />
          <span>{hasUnreadChat ? '💬 New Message!' : 'Match Chat (15m)'}</span>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: hasUnreadChat ? '#ffffff' : '#22c55e',
            boxShadow: hasUnreadChat ? '0 0 12px #ffffff' : '0 0 8px #22c55e'
          }} />
        </button>
      )}

      <MatchChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        matchData={activeChatData}
        currentUser={currentUser}
        showToast={showToast}
        onEndChat={() => {
          localStorage.removeItem('teamup_active_chat');
          setActiveChatData(null);
          setIsChatOpen(false);
          setHasUnreadChat(false);
        }}
      />

      <IncomingRequestsModal
        isOpen={isIncomingModalOpen}
        onClose={() => setIsIncomingModalOpen(false)}
        requests={incomingRequests}
        onAccept={handleAcceptMatch}
        onDecline={handleDeclineMatch}
      />

      <SendInviteModal
        isOpen={isSendInviteModalOpen}
        onClose={() => setIsSendInviteModalOpen(false)}
        targetPost={pendingInviteTarget}
        currentUser={currentUser}
        onSend={handleConfirmSendInvite}
        isSending={isSendingInvite}
      />

      {/* Minimized Chat Ended Alert Modal */}
      <AnimatePresence>
        {chatEndedAlertData && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              zIndex: 1300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.82)',
              backdropFilter: 'blur(6px)'
            }}
          >
            <motion.div
              className="modal-box"
              initial={{ scale: 0.88, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 20 }}
              style={{
                maxWidth: '440px',
                width: '92%',
                textAlign: 'center',
                padding: '2.2rem 1.85rem',
                borderRadius: '20px',
                background: '#1e293b',
                color: '#f8fafc',
                border: '2px solid #ef4444',
                boxShadow: '0 0 50px rgba(239, 68, 68, 0.45)'
              }}
            >
              <div style={{
                width: '62px',
                height: '62px',
                background: 'rgba(239, 68, 68, 0.18)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.1rem',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
              }}>
                <AlertCircle size={34} color="#ef4444" />
              </div>

              <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.35rem', color: '#f87171', fontWeight: '900', letterSpacing: '-0.02em' }}>
                Match Chat Ended
              </h3>
              
              <p style={{ margin: '0 0 1.6rem', fontSize: '0.98rem', color: '#e2e8f0', lineHeight: 1.55 }}>
                <strong style={{ color: '#ffffff', fontSize: '1.05rem' }}>"{chatEndedAlertData.endedBy}"</strong> has ended the match chat session.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setChatEndedAlertData(null)}
                style={{
                  minWidth: '160px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  borderColor: '#ef4444',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.95rem',
                  padding: '0.65rem 1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 4px 18px rgba(239, 68, 68, 0.4)',
                  cursor: 'pointer'
                }}
              >
                OK, Got It
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
