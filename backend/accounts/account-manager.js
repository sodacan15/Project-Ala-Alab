/**
 * Account Manager
 * Robust multi-user account management with encrypted credentials
 * and per-agent account support
 */

class AccountManager {
  constructor(sessionManager, tokenManager) {
    this.sessionManager = sessionManager;
    this.tokenManager = tokenManager;
    this.accounts = new Map();
  }

  /**
   * Create new user account
   * @param {string} userId - User ID
   * @param {object} profile - User profile from OAuth
   * @returns {object} Created account
   */
  createAccount(userId, profile) {
    if (this.accounts.has(userId)) {
      return this.accounts.get(userId);
    }

    const account = {
      userId,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      agents: {
        Gemini: {
          displayName: '',
          email: '',
          apiKey: null,
          model: 'gemini-2.0-flash',
          connected: false,
          lastConnected: null,
          createdAt: null,
          updatedAt: null
        },
        Claude: {
          displayName: '',
          email: '',
          apiKey: null,
          model: 'claude-3-5-sonnet-20241022',
          connected: false,
          lastConnected: null,
          createdAt: null,
          updatedAt: null
        },
        NotebookLM: {
          displayName: '',
          email: '',
          apiKey: null,
          notebookId: null,
          connected: false,
          lastConnected: null,
          createdAt: null,
          updatedAt: null
        }
      },
      preferences: {
        automationEnabled: false,
        automationRoutes: {
          'Gemini->Claude': false,
          'Claude->NotebookLM': false,
          'Gemini->NotebookLM': false
        },
        autoConfirm: false,
        theme: 'light'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        loginCount: 1,
        lastLogin: new Date(),
        apiCallsThisMonth: 0
      }
    };

    this.accounts.set(userId, account);
    return account;
  }

  /**
   * Get account by user ID
   * @param {string} userId - User ID
   * @returns {object} Account object
   */
  getAccount(userId) {
    return this.accounts.get(userId);
  }

  /**
   * Update agent credentials for account
   * @param {string} userId - User ID
   * @param {string} agentName - Agent name
   * @param {object} credentials - {displayName, email, apiKey}
   * @returns {object} Updated agent config
   */
  updateAgentCredentials(userId, agentName, credentials) {
    const account = this.getAccount(userId);
    if (!account) throw new Error('Account not found');

    const agent = account.agents[agentName];
    if (!agent) throw new Error(`Agent ${agentName} not found`);

    agent.displayName = credentials.displayName || agent.displayName;
    agent.email = credentials.email || agent.email;

    if (credentials.apiKey) {
      agent.apiKey = this.tokenManager.encryptToken(credentials.apiKey);
      agent.connected = true;
      agent.lastConnected = new Date();
    }

    agent.createdAt = agent.createdAt || new Date();
    agent.updatedAt = new Date();

    return agent;
  }

  /**
   * Get decrypted agent credentials
   * @param {string} userId - User ID
   * @param {string} agentName - Agent name
   * @returns {object} Decrypted credentials
   */
  getAgentCredentials(userId, agentName) {
    const account = this.getAccount(userId);
    if (!account) throw new Error('Account not found');

    const agent = account.agents[agentName];
    if (!agent) throw new Error(`Agent ${agentName} not found`);

    return {
      displayName: agent.displayName,
      email: agent.email,
      apiKey: agent.apiKey ? this.tokenManager.decryptToken(agent.apiKey) : null,
      model: agent.model,
      connected: agent.connected,
      lastConnected: agent.lastConnected
    };
  }

  /**
   * Disconnect agent
   * @param {string} userId - User ID
   * @param {string} agentName - Agent name
   */
  disconnectAgent(userId, agentName) {
    const account = this.getAccount(userId);
    if (!account) throw new Error('Account not found');

    const agent = account.agents[agentName];
    if (!agent) throw new Error(`Agent ${agentName} not found`);

    agent.apiKey = null;
    agent.connected = false;
    agent.updatedAt = new Date();
  }

  /**
   * Update user preferences
   * @param {string} userId - User ID
   * @param {object} preferences - Preference updates
   */
  updatePreferences(userId, preferences) {
    const account = this.getAccount(userId);
    if (!account) throw new Error('Account not found');

    account.preferences = { ...account.preferences, ...preferences };
    account.updatedAt = new Date();
  }

  /**
   * Get user preferences
   * @param {string} userId - User ID
   * @returns {object} User preferences
   */
  getPreferences(userId) {
    const account = this.getAccount(userId);
    if (!account) throw new Error('Account not found');
    return account.preferences;
  }

  /**
   * Enable/disable automation route
   * @param {string} userId - User ID
   * @param {string} route - Route (e.g., 'Gemini->Claude')
   * @param {boolean} enabled - Enable/disable
   */
  setAutomationRoute(userId, route, enabled) {
    const account = this.getAccount(userId);
    if (!account) throw new Error('Account not found');

    if (account.preferences.automationRoutes.hasOwnProperty(route)) {
      account.preferences.automationRoutes[route] = enabled;
      account.updatedAt = new Date();
    }
  }

  /**
   * Record API call for usage tracking
   * @param {string} userId - User ID
   * @param {string} agentName - Agent name
   */
  recordAPICall(userId, agentName) {
    const account = this.getAccount(userId);
    if (!account) return;

    account.metadata.apiCallsThisMonth++;
  }

  /**
   * Get account statistics
   * @param {string} userId - User ID
   * @returns {object} Account stats
   */
  getStats(userId) {
    const account = this.getAccount(userId);
    if (!account) throw new Error('Account not found');

    const connectedAgents = Object.entries(account.agents)
      .filter(([_, agent]) => agent.connected)
      .map(([name, _]) => name);

    return {
      userId,
      email: account.email,
      connectedAgents,
      connectedCount: connectedAgents.length,
      automationEnabled: account.preferences.automationEnabled,
      apiCallsThisMonth: account.metadata.apiCallsThisMonth,
      loginCount: account.metadata.loginCount,
      lastLogin: account.metadata.lastLogin,
      accountAge: Math.floor((Date.now() - account.createdAt.getTime()) / (1000 * 60 * 60 * 24)) + ' days'
    };
  }
}

module.exports = AccountManager;
