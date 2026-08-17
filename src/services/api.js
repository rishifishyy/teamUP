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

export const api = {
  async signup(userData) {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    return data;
  },

  async login(loginOrEmail, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginOrEmail, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed. Check your email/username and password.');
    return data;
  },

  async getMe() {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      const data = await res.json();
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Update failed');
    return data.user;
  },

  async getRequests() {
    try {
      const res = await fetch(`${API_BASE}/requests`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      return data.requests || [];
    } catch (err) {
      const stored = localStorage.getItem('teamup_realtime_requests');
      return stored ? JSON.parse(stored) : [];
    }
  },

  async createRequest(requestData) {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to post teammate request');
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

  async sendMatchRequest(postId) {
    const res = await fetch(`${API_BASE}/matches/${postId}/request`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send teammate request.');
    return data;
  },

  async getIncomingRequests() {
    try {
      const res = await fetch(`${API_BASE}/matches/incoming`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      const data = await res.json();
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
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  },

  async acceptMatch(matchId) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/accept`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to accept match.');
    return data;
  },

  async declineMatch(matchId) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/decline`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to decline match.');
    return data;
  },

  createPaymentOrder: async (data = {}) => {
    try {
      const token = localStorage.getItem('teamup_token');
      if (!token || token.startsWith('local-token-')) {
        throw new Error('You must be logged in with a real account to upgrade. Please log out and log back in.');
      }
      const res = await fetch(`${API_BASE}/payments/create-order`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create payment order');
      return result;
    } catch (err) {
      throw err;
    }
  },

  verifyPayment: async (paymentData) => {
    try {
      const res = await fetch(`${API_BASE}/payments/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(paymentData)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Payment verification failed');
      return result;
    } catch (err) {
      throw err;
    }
  },
  forgotPassword: async (email) => {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send reset email.');
    return data;
  },

  resetPassword: async (token, newPassword) => {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reset password.');
    return data;
  }
};
