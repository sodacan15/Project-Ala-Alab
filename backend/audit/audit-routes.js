module.exports = function createAuditRoutes(express, complianceAuditor) {
  const router = express.Router();

  // GET /audit/compliance
  // Get full compliance audit report
  router.get('/compliance', (req, res) => {
    try {
      const audit = complianceAuditor.runAudit();
      res.json({ success: true, audit });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET /audit/compliance/markdown
  // Get compliance audit as markdown
  router.get('/compliance/markdown', (req, res) => {
    try {
      const markdown = complianceAuditor.generateMarkdownReport();
      res.setHeader('Content-Type', 'text/markdown');
      res.send(markdown);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET /audit/compliance/status
  // Get compliance status summary
  router.get('/compliance/status', (req, res) => {
    try {
      const status = complianceAuditor.getStatusJSON();
      res.json({ success: true, ...status });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET /audit/requirement/:id
  // Check specific requirement
  router.get('/requirement/:id', (req, res) => {
    try {
      const { id } = req.params;
      const isImpl = complianceAuditor.isImplemented(id);

      res.json({
        success: true,
        requirement: id,
        implemented: isImpl
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};
