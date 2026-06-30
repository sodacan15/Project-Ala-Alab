/**
 * Enhanced Agent Relay
 * Supports automation, retry logic, message validation, and audit logging
 */

class EnhancedAgentRelay {
  constructor(config) {
    this.claudeAgent = config.claudeAgent;
    this.geminiAgent = config.geminiAgent;
    this.notebookLMAgent = config.notebookLMAgent;
    this.automationEngine = config.automationEngine;
    this.accountManager = config.accountManager;
    this.messageLog = [];
    this.auditLog = [];
  }

  /**
   * Validate message format
   * @param {object} message - Message to validate
   * @returns {object} Validation result
   */
  validateMessage(message) {
    if (!message.content || typeof message.content !== 'string') {
      return { valid: false, error: 'Invalid message content' };
    }

    if (message.content.length > 50000) {
      return { valid: false, error: 'Message exceeds maximum length (50KB)' };
    }

    return { valid: true };
  }

  /**
   * Route message from one agent to another
   * @param {object} params - Routing parameters
   * @returns {Promise<object>} Response from target agent
   */
  async relayMessage(params) {
    const {
      message,
      fromAgent,
      toAgent,
      context,
      userId,
      automated = false,
      userConfirmed = false
    } = params;

    const relayId = `relay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Validate message
      const validation = this.validateMessage(message);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Validate routing
      if (!this.validateRoute(fromAgent, toAgent)) {
        throw new Error(`Invalid route: ${fromAgent} → ${toAgent}`);
      }

      // Log relay attempt
      const relayEntry = {
        id: relayId,
        from: fromAgent,
        to: toAgent,
        userId,
        messageLength: message.content.length,
        automated,
        userConfirmed,
        timestamp: new Date(),
        status: 'in_progress'
      };

      this.messageLog.push(relayEntry);

      // Record API call
      if (userId && this.accountManager) {
        this.accountManager.recordAPICall(userId, toAgent);
      }

      // Get target agent
      const targetAgent = this.getAgent(toAgent);
      if (!targetAgent) {
        throw new Error(`Target agent ${toAgent} not found`);
      }

      // Process message through target agent
      const response = await targetAgent.processMessage(message.content, context);

      // Mark as completed
      relayEntry.status = 'completed';
      relayEntry.responseLength = response.length;
      relayEntry.completedAt = new Date();

      // Log to audit trail
      this.auditLog.push({
        relayId,
        type: 'relay_completed',
        from: fromAgent,
        to: toAgent,
        userId,
        timestamp: new Date()
      });

      return {
        success: true,
        relayId,
        from: toAgent,
        to: fromAgent,
        content: response,
        timestamp: new Date(),
        automated
      };
    } catch (err) {
      // Mark as failed
      const failedRelay = this.messageLog.find(m => m.id === relayId);
      if (failedRelay) {
        failedRelay.status = 'failed';
        failedRelay.error = err.message;
        failedRelay.failedAt = new Date();
      }

      // Log to audit trail
      this.auditLog.push({
        relayId,
        type: 'relay_failed',
        from: fromAgent,
        to: toAgent,
        userId,
        error: err.message,
        timestamp: new Date()
      });

      throw err;
    }
  }

  /**
   * Relay with automation support
   * @param {object} params - Routing parameters
   * @returns {Promise<object>} Response
   */
  async relayWithAutomation(params) {
    const { message, fromAgent, toAgent, context, userId } = params;

    // Check if automation is enabled for this route
    if (!this.automationEngine?.isAutomatable(fromAgent, toAgent)) {
      // Fall back to manual relay
      return this.relayMessage({ ...params, automated: false });
    }

    // Execute automation rule
    const automationResult = await this.automationEngine.executeRule(
      fromAgent,
      toAgent,
      message,
      async (msg) => this.relayMessage({
        message: msg,
        fromAgent,
        toAgent,
        context,
        userId,
        automated: true,
        userConfirmed: false
      })
    );

    if (!automationResult.automated) {
      // Fall back to manual if automation failed
      return this.relayMessage({ ...params, automated: false });
    }

    return automationResult.result;
  }

  /**
   * Validate that routing follows protocol
   * @param {string} fromAgent - Source agent
   * @param {string} toAgent - Target agent
   * @returns {boolean} Is valid
   */
  validateRoute(fromAgent, toAgent) {
    const validRoutes = {
      'User': ['Gemini', 'Claude', 'NotebookLM'],
      'Gemini': ['Claude', 'NotebookLM'],
      'Claude': ['NotebookLM'],
      'NotebookLM': []
    };

    const allowed = validRoutes[fromAgent] || [];
    return allowed.includes(toAgent);
  }

  /**
   * Get agent instance
   * @param {string} agentName - Agent name
   * @returns {object} Agent instance
   */
  getAgent(agentName) {
    switch (agentName) {
      case 'Claude': return this.claudeAgent;
      case 'Gemini': return this.geminiAgent;
      case 'NotebookLM': return this.notebookLMAgent;
      default: return null;
    }
  }

  /**
   * Get message history with filters
   * @param {object} filters - Filter options
   * @returns {array} Filtered messages
   */
  getMessageHistory(filters = {}) {
    let history = this.messageLog;

    if (filters.fromAgent) {
      history = history.filter(m => m.from === filters.fromAgent);
    }
    if (filters.toAgent) {
      history = history.filter(m => m.to === filters.toAgent);
    }
    if (filters.status) {
      history = history.filter(m => m.status === filters.status);
    }
    if (filters.userId) {
      history = history.filter(m => m.userId === filters.userId);
    }
    if (filters.automated !== undefined) {
      history = history.filter(m => m.automated === filters.automated);
    }
    if (filters.limit) {
      history = history.slice(-filters.limit);
    }

    return history;
  }

  /**
   * Get audit log with filters
   * @param {object} filters - Filter options
   * @returns {array} Audit entries
   */
  getAuditLog(filters = {}) {
    let log = this.auditLog;

    if (filters.type) {
      log = log.filter(e => e.type === filters.type);
    }
    if (filters.userId) {
      log = log.filter(e => e.userId === filters.userId);
    }
    if (filters.limit) {
      log = log.slice(-filters.limit);
    }

    return log;
  }

  /**
   * Clear old logs (keep last N records)
   * @param {number} maxRecords - Maximum records to keep
   */
  clearOldLogs(maxRecords = 10000) {
    if (this.messageLog.length > maxRecords) {
      this.messageLog = this.messageLog.slice(-maxRecords);
    }
    if (this.auditLog.length > maxRecords) {
      this.auditLog = this.auditLog.slice(-maxRecords);
    }
  }
}

module.exports = EnhancedAgentRelay;
