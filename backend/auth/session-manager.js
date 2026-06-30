const { v4: uuidv4 } = require('uuid');

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.users = new Map();
  }

  // Create new user session
  createSession(userProfile, tokens) {
    const sessionId = uuidv4();
    const userId = uuidv4();

    const session = {
      sessionId,
      userId,
      email: userProfile.email,
      name: userProfile.name,
      picture: userProfile.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenExpiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    const user = {
      userId,
      email: userProfile.email,
      name: userProfile.name,
      picture: userProfile.picture,
      googleId: userProfile.id,
      agents: {
        Gemini: {
          displayName: '',
          email: '',
          apiKey: null,
          model: 'gemini-2.0-flash',
          connected: false
        },
        Claude: {
          displayName: '',
          email: '',
          apiKey: null,
          model: 'claude-3-5-sonnet-20241022',
          connected: false
        },
        NotebookLM: {
          displayName: '',
          email: '',
          notebookId: null,
          connected: false
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(sessionId, session);
    this.users.set(userId, user);

    return { sessionId, userId, session, user };
  }

  // Get session by ID
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  // Get user by ID
  getUser(userId) {
    return this.users.get(userId);
  }

  // Update session
  updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const updated = { ...session, ...updates, lastActivity: new Date() };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  // Update user
  updateUser(userId, updates) {
    const user = this.users.get(userId);
    if (!user) return null;

    const updated = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(userId, updated);
    return updated;
  }

  // Update agent account
  updateAgentAccount(userId, agentName, agentData) {
    const user = this.users.get(userId);
    if (!user) return null;

    user.agents[agentName] = {
      ...user.agents[agentName],
      ...agentData,
      updatedAt: new Date()
    };

    this.users.set(userId, user);
    return user;
  }

  // Verify session is valid
  verifySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Check if session is still valid (24 hour timeout)
    const sessionAge = Date.now() - session.lastActivity.getTime();
    const maxAge = 24 * 60 * 60 * 1000;

    if (sessionAge > maxAge) {
      this.sessions.delete(sessionId);
      return false;
    }

    return true;
  }

  // Logout session
  logout(sessionId) {
    return this.sessions.delete(sessionId);
  }

  // Logout all sessions for user
  logoutUser(userId) {
    let count = 0;
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        count++;
      }
    }
    return count;
  }
}

module.exports = SessionManager;
