module.exports = function createAutomationRoutes(express, sessionManager, automationEngine, accountManager) {
  const router = express.Router();

  // Middleware to verify session
  const verifySession = (req, res, next) => {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    if (!sessionId || !sessionManager.verifySession(sessionId)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.sessionId = sessionId;
    req.session = sessionManager.getSession(sessionId);
    next();
  };

  // GET /automation/rules
  // Get all automation rules for current user
  router.get('/rules', verifySession, (req, res) => {
    try {
      const rules = Array.from(automationEngine.rules.values()).map(rule => ({
        route: `${rule.fromAgent}->${rule.toAgent}`,
        enabled: rule.enabled,
        confirmThreshold: rule.confirmThreshold,
        retryCount: rule.retryCount,
        timeout: rule.timeout
      }));

      res.json({ success: true, rules });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // PUT /automation/rule/:route
  // Update automation rule for specific route
  router.put('/rule/:route', verifySession, (req, res) => {
    try {
      const { route } = req.params;
      const { enabled, confirmThreshold } = req.body;

      const [fromAgent, toAgent] = route.split('->');
      if (!fromAgent || !toAgent) {
        return res.status(400).json({ error: 'Invalid route format' });
      }

      if (enabled !== undefined) {
        automationEngine.setRouteEnabled(fromAgent, toAgent, enabled);
      }

      if (confirmThreshold) {
        automationEngine.setConfirmThreshold(fromAgent, toAgent, confirmThreshold);
      }

      const rule = automationEngine.getRule(fromAgent, toAgent);
      res.json({
        success: true,
        message: `Route ${route} updated`,
        rule: {
          route,
          enabled: rule.enabled,
          confirmThreshold: rule.confirmThreshold
        }
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /automation/enable
  // Enable automation globally
  router.post('/enable', verifySession, (req, res) => {
    try {
      automationEngine.enabled = true;
      const prefs = accountManager.getPreferences(req.session.userId);
      accountManager.updatePreferences(req.session.userId, {
        automationEnabled: true
      });

      res.json({
        success: true,
        message: 'Automation enabled',
        automationEnabled: true
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /automation/disable
  // Disable automation globally
  router.post('/disable', verifySession, (req, res) => {
    try {
      automationEngine.enabled = false;
      accountManager.updatePreferences(req.session.userId, {
        automationEnabled: false
      });

      res.json({
        success: true,
        message: 'Automation disabled',
        automationEnabled: false
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET /automation/history
  // Get automation execution history
  router.get('/history', verifySession, (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const status = req.query.status || null;

      const filters = { limit };
      if (status) filters.status = status;

      const history = automationEngine.getExecutionHistory(filters);

      res.json({
        success: true,
        count: history.length,
        history
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /automation/clear-history
  // Clear automation execution history
  router.post('/clear-history', verifySession, (req, res) => {
    try {
      automationEngine.clearHistory();
      res.json({
        success: true,
        message: 'Automation history cleared'
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET /automation/status
  // Get automation engine status
  router.get('/status', verifySession, (req, res) => {
    try {
      const status = {
        enabled: automationEngine.enabled,
        rulesCount: automationEngine.rules.size,
        executionCount: automationEngine.executions.length,
        enabledRoutes: Array.from(automationEngine.rules.values())
          .filter(r => r.enabled)
          .map(r => `${r.fromAgent}->${r.toAgent}`)
      };

      res.json({ success: true, ...status });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};
