class BaseAgent {
  constructor(config) {
    this.name = config.name;
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.systemPrompt = config.systemPrompt || '';
    this.messageHistory = [];
  }

  /**
   * Process a message through the agent
   * @param {string} userMessage - User input
   * @param {object} context - Context document content
   * @returns {Promise<string>} Agent response
   */
  async processMessage(userMessage, context) {
    throw new Error('processMessage must be implemented by subclass');
  }

  /**
   * Initialize agent with context
   * @param {object} context - Context document
   */
  async initialize(context) {
    this.context = context;
    this.messageHistory = [];
  }

  /**
   * Add message to history
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   */
  addToHistory(role, content) {
    this.messageHistory.push({ role, content });
  }

  /**
   * Get full system prompt with context
   * @returns {string} Complete system prompt
   */
  getFullSystemPrompt() {
    return `${this.systemPrompt}\n\n## Active Community Memory Document\n\n${this.context?.content || ''}`;
  }

  /**
   * Clear message history
   */
  clearHistory() {
    this.messageHistory = [];
  }

  /**
   * Validate response format
   * @param {string} response - Response to validate
   * @returns {boolean} Is valid
   */
  validateResponse(response) {
    if (!response || typeof response !== 'string') {
      return false;
    }
    return true;
  }
}

module.exports = BaseAgent;
