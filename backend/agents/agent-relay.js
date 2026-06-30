const BaseAgent = require('./base-agent');

class AgentRelay {
  constructor(config) {
    this.claudeAgent = config.claudeAgent;
    this.geminiAgent = config.geminiAgent;
    this.notebookLMAgent = config.notebookLMAgent;
    this.messageLog = [];
  }

  /**
   * Route message from one agent to another
   * @param {object} message - Message object
   * @param {string} fromAgent - Source agent name
   * @param {string} toAgent - Target agent name
   * @param {object} context - Context document
   * @returns {Promise<object>} Response from target agent
   */
  async relayMessage(message, fromAgent, toAgent, context) {
    try {
      // Validate routing
      if (!this.validateRoute(fromAgent, toAgent)) {
        throw new Error(`Invalid route: ${fromAgent} → ${toAgent}`);
      }

      // Format message for transit
      const transitMessage = {
        id: this.generateMessageId(),
        from: fromAgent,
        to: toAgent,
        timestamp: new Date().toISOString(),
        content: message.content,
        metadata: message.metadata || {},
        status: 'in_transit'
      };

      this.messageLog.push(transitMessage);

      // Get target agent
      const targetAgent = this.getAgent(toAgent);
      if (!targetAgent) {
        throw new Error(`Target agent ${toAgent} not found`);
      }

      // Process message through target agent
      const response = await targetAgent.processMessage(message.content, context);

      // Mark as processed
      transitMessage.status = 'processed';
      transitMessage.response = response;
      transitMessage.responseTimestamp = new Date().toISOString();

      return {
        success: true,
        messageId: transitMessage.id,
        from: toAgent,
        to: fromAgent,
        content: response,
        timestamp: transitMessage.responseTimestamp
      };
    } catch (err) {
      console.error('Relay error:', err);
      return {
        success: false,
        error: err.message,
        from: toAgent,
        to: fromAgent
      };
    }
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
   * @returns {BaseAgent} Agent instance
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
   * Generate unique message ID
   * @returns {string} Message ID
   */
  generateMessageId() {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get message history
   * @param {object} filters - Filter options (fromAgent, toAgent, limit)
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
    if (filters.limit) {
      history = history.slice(-filters.limit);
    }

    return history;
  }

  /**
   * Clear message history
   */
  clearHistory() {
    this.messageLog = [];
  }
}

module.exports = AgentRelay;
