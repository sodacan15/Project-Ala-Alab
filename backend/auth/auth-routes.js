const express = require('express');
const crypto = require('crypto');
const OAuthHandler = require('./oauth-handler');
const TokenManager = require('./token-manager');
const SessionManager = require('./session-manager');

module.exports = function createAuthRoutes(config) {
  const router = express.Router();
  const oauthHandler = new OAuthHandler(config.oauth);
  const tokenManager = new TokenManager(config.encryptionKey);
  const sessionManager = new SessionManager();

  // Store in-flight auth states
  const authStates = new Map();

  // Middleware to verify session
  const verifySession = (req, res, next) => {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    if (!sessionId || !sessionManager.verifySession(sessionId)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    }
    req.sessionId = sessionId;
    req.session = sessionManager.getSession(sessionId);
    next();
  };

  // GET /auth/oauth-url
  // Generate OAuth authorization URL
  router.get('/oauth-url', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    authStates.set(state, { createdAt: Date.now() });

    // Clean up old states (older than 10 minutes)
    for (const [s, data] of authStates) {
      if (Date.now() - data.createdAt > 10 * 60 * 1000) {
        authStates.delete(s);
      }
    }

    const authUrl = oauthHandler.getAuthorizationUrl(state);
    res.json({ authUrl, state });
  });

  // POST /auth/google/callback
  // Handle OAuth callback and exchange code for tokens
  router.post('/google/callback', async (req, res) => {
    try {
      const { code, state } = req.body;

      // Verify state
      if (!authStates.has(state)) {
        return res.status(400).json({ error: 'Invalid or expired state parameter' });
      }
      authStates.delete(state);

      // Exchange code for tokens
      const tokens = await oauthHandler.exchangeCodeForTokens(code);

      // Get user profile
      const userProfile = await oauthHandler.getUserProfile(tokens.access_token);

      // Encrypt tokens before storing
      const encryptedAccessToken = tokenManager.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? tokenManager.encryptToken(tokens.refresh_token)
        : null;

      // Create session
      const { sessionId, userId, user } = sessionManager.createSession(userProfile, {
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_in: tokens.expires_in
      });

      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });

      res.json({
        success: true,
        sessionId,
        userId,
        user: {
          email: user.email,
          name: user.name,
          picture: user.picture
        }
      });
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  // GET /auth/verify
  // Verify current session
  router.get('/verify', (req, res) => {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    if (!sessionId || !sessionManager.verifySession(sessionId)) {
      return res.json({ valid: false });
    }

    const session = sessionManager.getSession(sessionId);
    const user = sessionManager.getUser(session.userId);

    res.json({
      valid: true,
      sessionId,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        agents: user.agents
      }
    });
  });

  // POST /auth/logout
  // Logout current session
  router.post('/logout', verifySession, (req, res) => {
    sessionManager.logout(req.sessionId);
    res.clearCookie('sessionId');
    res.json({ success: true });
  });

  // POST /auth/refresh-token
  // Refresh access token
  router.post('/refresh-token', verifySession, async (req, res) => {
    try {
      const session = req.session;
      if (!session.refreshToken) {
        return res.status(400).json({ error: 'No refresh token available' });
      }

      const decryptedRefreshToken = tokenManager.decryptToken(session.refreshToken);
      const newTokens = await oauthHandler.refreshAccessToken(decryptedRefreshToken);

      const encryptedAccessToken = tokenManager.encryptToken(newTokens.access_token);

      const updated = sessionManager.updateSession(req.sessionId, {
        accessToken: encryptedAccessToken,
        tokenExpiresAt: tokenManager.getTokenExpiration(newTokens.expires_in)
      });

      res.json({ success: true, expiresIn: newTokens.expires_in });
    } catch (err) {
      console.error('Token refresh error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  // GET /auth/session
  // Get current session data
  router.get('/session', verifySession, (req, res) => {
    const user = sessionManager.getUser(req.session.userId);
    res.json({
      sessionId: req.sessionId,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        agents: user.agents
      }
    });
  });

  // PUT /auth/agent/:agentName
  // Update agent account credentials
  router.put('/agent/:agentName', verifySession, (req, res) => {
    try {
      const { displayName, email, apiKey } = req.body;
      const agentName = req.params.agentName;

      if (!['Gemini', 'Claude', 'NotebookLM'].includes(agentName)) {
        return res.status(400).json({ error: 'Invalid agent name' });
      }

      const encryptedKey = apiKey ? tokenManager.encryptToken(apiKey) : null;

      const updated = sessionManager.updateAgentAccount(req.session.userId, agentName, {
        displayName: displayName || '',
        email: email || '',
        apiKey: encryptedKey,
        connected: !!(displayName && email && apiKey)
      });

      res.json({
        success: true,
        agents: updated.agents
      });
    } catch (err) {
      console.error('Agent update error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  // GET /auth/agent/:agentName/credentials
  // Get decrypted agent credentials (for API calls)
  router.get('/agent/:agentName/credentials', verifySession, (req, res) => {
    try {
      const agentName = req.params.agentName;
      const user = sessionManager.getUser(req.session.userId);
      const agent = user.agents[agentName];

      if (!agent || !agent.apiKey) {
        return res.status(404).json({ error: 'Agent credentials not found' });
      }

      const decryptedKey = tokenManager.decryptToken(agent.apiKey);

      res.json({
        displayName: agent.displayName,
        email: agent.email,
        apiKey: decryptedKey,
        model: agent.model,
        connected: agent.connected
      });
    } catch (err) {
      console.error('Credentials fetch error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};
