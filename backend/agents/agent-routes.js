const ClaudeAgent = require('./claude-agent');
const GeminiAgent = require('./gemini-agent');
const NotebookLMAgent = require('./notebooklm-agent');
const AgentRelay = require('./agent-relay');

module.exports = function createAgentRoutes(express, sessionManager, tokenManager, contextFileManager) {
  const router = express.Router();
  const agents = new Map();
  const relays = new Map();

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

  // Helper: Get or create agent for user
  const getAgentInstance = async (userId, agentName, config) => {
    const key = `${userId}-${agentName}`;
    if (agents.has(key)) return agents.get(key);

    let agent;
    switch (agentName) {
      case 'Claude':
        agent = new ClaudeAgent({
          apiKey: config.apiKey,
          model: config.model
        });
        break;
      case 'Gemini':
        agent = new GeminiAgent({
          apiKey: config.apiKey,
          model: config.model
        });
        break;
      case 'NotebookLM':
        agent = new NotebookLMAgent({
          apiKey: config.apiKey,
          model: config.model
        });
        break;
      default:
        throw new Error(`Unknown agent: ${agentName}`);
    }

    agents.set(key, agent);
    return agent;
  };

  // Helper: Get or create relay for user
  const getRelayInstance = async (userId, userAgents) => {
    const key = userId;
    if (relays.has(key)) return relays.get(key);

    const relay = new AgentRelay({
      claudeAgent: userAgents.Claude,
      geminiAgent: userAgents.Gemini,
      notebookLMAgent: userAgents.NotebookLM
    });

    relays.set(key, relay);
    return relay;
  };

  // POST /agents/initialize
  // Initialize all agents for user
  router.post('/initialize', verifySession, async (req, res) => {
    try {
      const user = sessionManager.getUser(req.session.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const userAgents = {};
      const context = contextFileManager.readCurrentContext();

      // Initialize each agent
      for (const [agentName, agentConfig] of Object.entries(user.agents)) {
        if (!agentConfig.apiKey) {
          continue; // Skip if no API key
        }

        try {
          const decryptedKey = tokenManager.decryptToken(agentConfig.apiKey);
          const agent = await getAgentInstance(req.session.userId, agentName, {
            apiKey: decryptedKey,
            model: agentConfig.model
          });
          await agent.initialize(context);
          userAgents[agentName] = agent;
        } catch (err) {
          console.error(`Failed to initialize ${agentName}:`, err);
        }
      }

      res.json({
        success: true,
        initialized: Object.keys(userAgents),
        message: `Initialized ${Object.keys(userAgents).length} agent(s)`
      });
    } catch (err) {
      console.error('Initialization error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  // POST /agents/:agentName/message
  // Send message to specific agent
  router.post('/:agentName/message', verifySession, async (req, res) => {
    try {
      const { agentName } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Content required' });
      }

      const user = sessionManager.getUser(req.session.userId);
      const agentConfig = user.agents[agentName];

      if (!agentConfig || !agentConfig.apiKey) {
        return res.status(404).json({ error: `Agent ${agentName} not configured` });
      }

      const decryptedKey = tokenManager.decryptToken(agentConfig.apiKey);
      const agent = await getAgentInstance(req.session.userId, agentName, {
        apiKey: decryptedKey,
        model: agentConfig.model
      });

      const context = contextFileManager.readCurrentContext();
      const response = await agent.processMessage(content, context);

      res.json({
        success: true,
        agent: agentName,
        response,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error(`Agent error (${req.params.agentName}):`, err);
      res.status(400).json({ error: err.message });
    }
  });

  // POST /agents/:agentName/stream
  // Stream message from agent
  router.post('/:agentName/stream', verifySession, async (req, res) => {
    try {
      const { agentName } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Content required' });
      }

      const user = sessionManager.getUser(req.session.userId);
      const agentConfig = user.agents[agentName];

      if (!agentConfig || !agentConfig.apiKey) {
        return res.status(404).json({ error: `Agent ${agentName} not configured` });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const decryptedKey = tokenManager.decryptToken(agentConfig.apiKey);
      const agent = await getAgentInstance(req.session.userId, agentName, {
        apiKey: decryptedKey,
        model: agentConfig.model
      });

      const context = contextFileManager.readCurrentContext();

      await agent.streamMessage(content, context, (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      console.error(`Streaming error (${req.params.agentName}):`, err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  });

  // POST /agents/relay
  // Relay message between agents
  router.post('/relay', verifySession, async (req, res) => {
    try {
      const { fromAgent, toAgent, content, metadata } = req.body;

      if (!fromAgent || !toAgent || !content) {
        return res.status(400).json({ error: 'fromAgent, toAgent, and content required' });
      }

      const user = sessionManager.getUser(req.session.userId);
      const userAgents = {};
      const context = contextFileManager.readCurrentContext();

      // Initialize required agents
      for (const agentName of [fromAgent, toAgent]) {
        const agentConfig = user.agents[agentName];
        if (!agentConfig || !agentConfig.apiKey) {
          return res.status(404).json({ error: `Agent ${agentName} not configured` });
        }
        const decryptedKey = tokenManager.decryptToken(agentConfig.apiKey);
        const agent = await getAgentInstance(req.session.userId, agentName, {
          apiKey: decryptedKey,
          model: agentConfig.model
        });
        await agent.initialize(context);
        userAgents[agentName] = agent;
      }

      // Create or get relay
      const relay = await getRelayInstance(req.session.userId, userAgents);

      // Relay message
      const result = await relay.relayMessage(
        { content, metadata },
        fromAgent,
        toAgent,
        context
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err) {
      console.error('Relay error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  // GET /agents/:agentName/history
  // Get agent message history
  router.get('/:agentName/history', verifySession, async (req, res) => {
    try {
      const { agentName } = req.params;
      const user = sessionManager.getUser(req.session.userId);

      if (!user.agents[agentName]) {
        return res.status(404).json({ error: `Agent ${agentName} not found` });
      }

      const key = `${req.session.userId}-${agentName}`;
      const agent = agents.get(key);

      if (!agent) {
        return res.json({ history: [] });
      }

      res.json({
        agent: agentName,
        history: agent.messageHistory
      });
    } catch (err) {
      console.error('History error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  // POST /agents/:agentName/clear
  // Clear agent history
  router.post('/:agentName/clear', verifySession, async (req, res) => {
    try {
      const { agentName } = req.params;
      const key = `${req.session.userId}-${agentName}`;
      const agent = agents.get(key);

      if (agent) {
        agent.clearHistory();
      }

      res.json({ success: true, message: `Cleared ${agentName} history` });
    } catch (err) {
      console.error('Clear error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  // POST /agents/:agentName/evaluate-sensitivity
  // Evaluate content for sensitive data (Claude only)
  router.post('/:agentName/evaluate-sensitivity', verifySession, async (req, res) => {
    try {
      const { agentName } = req.params;
      const { content } = req.body;

      if (agentName !== 'Claude') {
        return res.status(400).json({ error: 'Only Claude can evaluate sensitivity' });
      }

      if (!content) {
        return res.status(400).json({ error: 'Content required' });
      }

      const user = sessionManager.getUser(req.session.userId);
      const agentConfig = user.agents[agentName];

      if (!agentConfig || !agentConfig.apiKey) {
        return res.status(404).json({ error: `Agent ${agentName} not configured` });
      }

      const decryptedKey = tokenManager.decryptToken(agentConfig.apiKey);
      const agent = await getAgentInstance(req.session.userId, agentName, {
        apiKey: decryptedKey,
        model: agentConfig.model
      });

      const evaluation = await agent.evaluateSensitivity(content);

      res.json({
        success: true,
        evaluation
      });
    } catch (err) {
      console.error('Sensitivity evaluation error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  // GET /agents/status
  // Get all agents status for current user
  router.get('/status', verifySession, (req, res) => {
    try {
      const user = sessionManager.getUser(req.session.userId);
      const status = {};

      for (const [agentName, agentConfig] of Object.entries(user.agents)) {
        const key = `${req.session.userId}-${agentName}`;
        status[agentName] = {
          displayName: agentConfig.displayName,
          email: agentConfig.email,
          model: agentConfig.model,
          connected: agentConfig.connected,
          initialized: agents.has(key),
          hasHistory: agents.has(key) && agents.get(key).messageHistory.length > 0
        };
      }

      res.json({ success: true, agents: status });
    } catch (err) {
      console.error('Status error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};
