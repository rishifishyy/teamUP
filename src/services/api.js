/**
 * TEAMUP API Client Service
 * Connects to the Express / MongoDB Backend with automatic local fallback
 */

const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('teamup_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function safeJson(res, defaultError = 'Request failed') {
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {}

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || (defaultError + (res.status ? ` (Status ${res.status})` : ''));
    const err = new Error(errorMsg);
    if (data?.isFreeLimitReached || res.status === 403) {
      err.isFreeLimitReached = true;
    }
    throw err;
  }
  return data;
}

export const api = {
  async sendRegistrationOtp(userData) {
    const res = await fetch(`${API_BASE}/auth/send-registration-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return safeJson(res, 'Failed to send verification code');
  },

  async signup(userData) {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return safeJson(res, 'Signup failed');
  },

  async login(loginOrEmail, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginOrEmail, password })
    });
    return safeJson(res, 'Login failed. Check your credentials.');
  },

  async getMe() {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      const data = await safeJson(res);
      return data.user;
    } catch {
      return null;
    }
  },

  async updateProfile(profileData) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    const data = await safeJson(res, 'Failed to update profile');
    return data.user;
  },

  async getRequests() {
    try {
      const res = await fetch(`${API_BASE}/requests`);
      if (!res.ok) return [];
      const data = await safeJson(res);
      return data.requests || [];
    } catch {
      return [];
    }
  },

  async createRequest(requestData) {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestData)
    });
    const data = await safeJson(res, 'Failed to post teammate request');
    return data.request;
  },

  async deleteRequest(id) {
    try {
      const res = await fetch(`${API_BASE}/requests/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return res.ok;
    } catch {
      return true;
    }
  },

  async sendMatchRequest(postId, setupData = {}) {
    const res = await fetch(`${API_BASE}/matches/${postId}/request`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(setupData)
    });
    return safeJson(res, 'Failed to send teammate request');
  },

  async getIncomingRequests() {
    try {
      const res = await fetch(`${API_BASE}/matches/incoming`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      const data = await safeJson(res);
      return data.incoming || [];
    } catch {
      return [];
    }
  },

  async getAcceptedMatches() {
    try {
      const res = await fetch(`${API_BASE}/matches/accepted`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await safeJson(res);
    } catch {
      return null;
    }
  },

  async acceptMatch(matchId) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/accept`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return safeJson(res, 'Failed to accept match');
  },

  async declineMatch(matchId) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/decline`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return safeJson(res, 'Failed to decline match');
  },

  async getNotifications() {
    try {
      const res = await fetch(`${API_BASE}/matches/notifications`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return { totalCount: 0, incoming: [], declined: [], accepted: null };
      return await safeJson(res);
    } catch {
      return { totalCount: 0, incoming: [], declined: [], accepted: null };
    }
  },

  async clearNotifications() {
    try {
      const res = await fetch(`${API_BASE}/matches/notifications/clear`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async dismissNotification(matchId) {
    try {
      const res = await fetch(`${API_BASE}/matches/notifications/${matchId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async dismissMatch() {
    try {
      const res = await fetch(`${API_BASE}/matches/dismiss`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async dismissDeclined() {
    try {
      const res = await fetch(`${API_BASE}/matches/notifications/clear`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getActiveChatSession() {
    try {
      const res = await fetch(`${API_BASE}/chat/active-session`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await safeJson(res);
    } catch {
      return null;
    }
  },

  async getChatMessages(matchId) {
    try {
      const res = await fetch(`${API_BASE}/chat/${matchId}/messages`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await safeJson(res);
    } catch {
      return null;
    }
  },

  async sendChatMessage(matchId, text) {
    const res = await fetch(`${API_BASE}/chat/${matchId}/message`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text })
    });
    return safeJson(res, 'Failed to send message');
  },

  async endChatSession(matchId) {
    const res = await fetch(`${API_BASE}/chat/${matchId}/end`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return safeJson(res, 'Failed to end chat');
  },

  createPaymentOrder: async (data = {}) => {
    const token = localStorage.getItem('teamup_token');
    if (!token || token.startsWith('local-token-')) {
      throw new Error('You must be logged in with a real account to upgrade. Please log out and log back in.');
    }
    const res = await fetch(`${API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return safeJson(res, 'Failed to create payment order');
  },

  verifyPayment: async (paymentData) => {
    const res = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData)
    });
    return safeJson(res, 'Payment verification failed');
  },

  forgotPassword: async (email) => {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return safeJson(res, 'Failed to send reset email');
  },

  resetPassword: async (token, newPassword) => {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    return safeJson(res, 'Failed to reset password');
  }
};
