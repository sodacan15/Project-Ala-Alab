/**
 * Automation Layer
 * Allows conditional automation of agent relay without manual copy-paste
 * Users can enable/disable automation rules per route
 */

class AutomationEngine {
  constructor(config = {}) {
    this.rules = new Map();
    this.executions = [];
    this.enabled = config.enabled !== false;
    this.confirmThreshold = config.confirmThreshold || 'manual'; // 'manual' | 'auto' | 'queue'
  }

  /**
   * Define automation rule
   * @param {string} fromAgent - Source agent
   * @param {string} toAgent - Target agent
   * @param {object} config - Rule configuration
   */
  defineRule(fromAgent, toAgent, config = {}) {
    const key = `${fromAgent}->${toAgent}`;
    this.rules.set(key, {
      fromAgent,
      toAgent,
      enabled: config.enabled !== false,
      confirmThreshold: config.confirmThreshold || 'manual',
      filter: config.filter || null, // Optional: function(message) => boolean
      transform: config.transform || null, // Optional: function(message) => message
      retryCount: config.retryCount || 1,
      timeout: config.timeout || 30000
    });
  }

  /**
   * Get rule for a route
   * @param {string} fromAgent - Source agent
   * @param {string} toAgent - Target agent
   * @returns {object} Rule configuration
   */
  getRule(fromAgent, toAgent) {
    const key = `${fromAgent}->${toAgent}`;
    return this.rules.get(key);
  }

  /**
   * Check if route is automatable
   * @param {string} fromAgent - Source agent
   * @param {string} toAgent - Target agent
   * @returns {boolean} Is automatable
   */
  isAutomatable(fromAgent, toAgent) {
    if (!this.enabled) return false;

    const rule = this.getRule(fromAgent, toAgent);
    return rule && rule.enabled;
  }

  /**
   * Execute automation rule
   * @param {string} fromAgent - Source agent
   * @param {string} toAgent - Target agent
   * @param {object} message - Message to relay
   * @param {Function} relayFunction - Function to perform relay
   * @returns {Promise<object>} Execution result
   */
  async executeRule(fromAgent, toAgent, message, relayFunction) {
    const rule = this.getRule(fromAgent, toAgent);
    if (!rule || !rule.enabled) {
      return {
        success: false,
        reason: 'Rule not enabled',
        automated: false
      };
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const execution = {
      id: executionId,
      fromAgent,
      toAgent,
      messageContent: message.content,
      status: 'pending',
      timestamp: new Date(),
      confirmThreshold: rule.confirmThreshold
    };

    try {
      // Apply filter if defined
      if (rule.filter && !rule.filter(message)) {
        execution.status = 'filtered';
        execution.reason = 'Message filtered by rule';
        this.executions.push(execution);
        return { ...execution, automated: false };
      }

      // Apply transform if defined
      let transformedMessage = message;
      if (rule.transform) {
        transformedMessage = rule.transform(message);
      }

      // Execute relay with retry logic
      let result;
      let lastError;

      for (let attempt = 1; attempt <= rule.retryCount; attempt++) {
        try {
          result = await Promise.race([
            relayFunction(transformedMessage),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Relay timeout')), rule.timeout)
            )
          ]);
          break;
        } catch (err) {
          lastError = err;
          if (attempt < rule.retryCount) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (result) {
        execution.status = 'completed';
        execution.result = result;
        execution.completedAt = new Date();
      } else {
        throw lastError || new Error('Relay failed');
      }
    } catch (err) {
      execution.status = 'failed';
      execution.error = err.message;
      execution.failedAt = new Date();
    }

    this.executions.push(execution);
    return {
      ...execution,
      automated: execution.status === 'completed'
    };
  }

  /**
   * Get execution history
   * @param {object} filters - Filter options
   * @returns {array} Execution records
   */
  getExecutionHistory(filters = {}) {
    let history = this.executions;

    if (filters.fromAgent) {
      history = history.filter(e => e.fromAgent === filters.fromAgent);
    }
    if (filters.toAgent) {
      history = history.filter(e => e.toAgent === filters.toAgent);
    }
    if (filters.status) {
      history = history.filter(e => e.status === filters.status);
    }
    if (filters.limit) {
      history = history.slice(-filters.limit);
    }

    return history;
  }

  /**
   * Enable/disable route automation
   * @param {string} fromAgent - Source agent
   * @param {string} toAgent - Target agent
   * @param {boolean} enabled - Enable/disable
   */
  setRouteEnabled(fromAgent, toAgent, enabled) {
    const rule = this.getRule(fromAgent, toAgent);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Set confirm threshold for route
   * @param {string} fromAgent - Source agent
   * @param {string} toAgent - Target agent
   * @param {string} threshold - 'manual' | 'auto' | 'queue'
   */
  setConfirmThreshold(fromAgent, toAgent, threshold) {
    const rule = this.getRule(fromAgent, toAgent);
    if (rule) {
      rule.confirmThreshold = threshold;
    }
  }

  /**
   * Clear execution history
   */
  clearHistory() {
    this.executions = [];
  }
}

module.exports = AutomationEngine;
