const BaseAgent = require('./base-agent');

class NotebookLMAgent extends BaseAgent {
  constructor(config) {
    const systemPrompt = `You are NotebookLM, the Archivist in the Ala-Alab system.

Your role: Corpus maintenance and cross-source synthesis.

Your responsibilities:
1. Hold the accumulated corpus of community knowledge (context.md)
2. Answer synthesis questions by drawing connections across multiple sources
3. Provide citations for all claims (source + section + entry)
4. Surface contradictions and gaps in the record
5. Generate reports that synthesize multiple data points

Your lane: Corpus and synthesis only. Do not create new entries. Do not intake raw input.

When you receive a query:
- Search the entire context document for relevant entries
- Identify which source types contribute to the answer:
  - [FIELD] = ground truth, recent observations
  - [ORAL] = community knowledge, historical memory
  - [OFFICIAL] = authoritative but potentially outdated
  - [SYNTHESIS] = AI-generated connections
- Build your answer by:
  1. Naming the specific entries you're drawing from
  2. Explaining how they connect
  3. Noting any contradictions
  4. Assessing overall confidence
  5. Flagging gaps in the record

Always cite like this: [See: ## Section Name → #### Entry Title]

If asked to generate a report:
- Synthesize across at least 3 sources
- Highlight patterns and contradictions
- Note areas needing more data
- Recommend next research directions`;

    super({
      ...config,
      name: 'NotebookLM',
      systemPrompt
    });

    // NotebookLM API is still in limited availability
    // For now, this uses a local-first approach with API hooks for future expansion
    this.notebooks = new Map();
    this.syntheticQueries = [];
  }

  /**
   * Initialize with a notebook corpus
   * @param {object} context - Context document
   * @param {string} notebookId - Optional NotebookLM notebook ID
   */
  async initialize(context, notebookId = null) {
    await super.initialize(context);
    this.notebookId = notebookId;
    this.corpus = this.parseContext(context);
  }

  /**
   * Parse context into searchable corpus
   * @param {object} context - Context document
   * @returns {array} Parsed entries
   */
  parseContext(context) {
    if (!context || !context.content) return [];

    const entries = [];
    const lines = context.content.split('\n');
    let currentSection = '';
    let currentEntry = '';

    for (const line of lines) {
      if (line.match(/^## /)) {
        if (currentEntry) {
          entries.push({
            section: currentSection,
            title: currentEntry.match(/^#### (.+)/)?.[1] || 'Untitled',
            content: currentEntry,
            type: this.detectEntryType(currentEntry)
          });
        }
        currentSection = line.replace(/^## /, '').trim();
        currentEntry = '';
      } else if (line.match(/^#### /)) {
        if (currentEntry) {
          entries.push({
            section: currentSection,
            title: line.replace(/^#### /, '').trim(),
            content: currentEntry,
            type: this.detectEntryType(currentEntry)
          });
        }
        currentEntry = line;
      } else {
        currentEntry += `\n${line}`;
      }
    }

    if (currentEntry) {
      entries.push({
        section: currentSection,
        title: currentEntry.match(/^#### (.+)/)?.[1] || 'Untitled',
        content: currentEntry,
        type: this.detectEntryType(currentEntry)
      });
    }

    return entries;
  }

  /**
   * Detect entry source type
   * @param {string} content - Entry content
   * @returns {string} Source type tag
   */
  detectEntryType(content) {
    if (content.includes('[FIELD]')) return 'FIELD';
    if (content.includes('[ORAL]')) return 'ORAL';
    if (content.includes('[OFFICIAL]')) return 'OFFICIAL';
    if (content.includes('[POLICY]')) return 'POLICY';
    if (content.includes('[SYNTHESIS]')) return 'SYNTHESIS';
    if (content.includes('[SECONDARY]')) return 'SECONDARY';
    return 'UNKNOWN';
  }

  /**
   * Search corpus for entries matching query
   * @param {string} query - Search query
   * @returns {array} Matching entries
   */
  searchCorpus(query) {
    const keywords = query.toLowerCase().split(' ');
    return this.corpus.filter(entry => {
      const text = `${entry.title} ${entry.content}`.toLowerCase();
      return keywords.some(kw => text.includes(kw));
    });
  }

  /**
   * Process synthesis query
   * @param {string} userMessage - User query
   * @param {object} context - Context document
   * @returns {Promise<string>} Synthesis response
   */
  async processMessage(userMessage, context) {
    try {
      if (context) {
        await this.initialize(context);
      }

      this.addToHistory('user', userMessage);

      // Search corpus for relevant entries
      const relevantEntries = this.searchCorpus(userMessage);

      if (relevantEntries.length === 0) {
        const response = `I searched the community memory document but found no entries directly matching your query: "${userMessage}". \n\nThis may indicate a gap in the record. Would you like me to suggest topics that ARE in the document, or would you like to submit new information?`;
        this.addToHistory('assistant', response);
        return response;
      }

      // Build synthesis response
      let response = `Based on the community memory document, here's what I found:\n\n`;
      response += `**Relevant entries (${relevantEntries.length} found):**\n\n`;

      const bySection = {};
      relevantEntries.forEach(entry => {
        if (!bySection[entry.section]) bySection[entry.section] = [];
        bySection[entry.section].push(entry);
      });

      for (const [section, entries] of Object.entries(bySection)) {
        response += `**${section}:**\n`;
        entries.forEach(entry => {
          response += `- [${entry.type}] ${entry.title}\n`;
        });
        response += `\n`;
      }

      // Detect contradictions
      const contradictions = this.findContradictions(relevantEntries);
      if (contradictions.length > 0) {
        response += `**⚠️ Contradictions detected:**\n`;
        contradictions.forEach(c => {
          response += `- ${c}\n`;
        });
        response += `\n`;
      }

      response += `**Next steps:** Would you like me to dive deeper into any of these entries, or would you like to add new information?`;

      this.addToHistory('assistant', response);
      this.syntheticQueries.push({ query: userMessage, timestamp: new Date() });

      return response;
    } catch (err) {
      console.error('NotebookLM processing error:', err);
      throw new Error(`NotebookLM processing failed: ${err.message}`);
    }
  }

  /**
   * Find contradictions between entries
   * @param {array} entries - Entries to compare
   * @returns {array} Contradictions found
   */
  findContradictions(entries) {
    const contradictions = [];
    // Simple contradiction detection: entries from different source types about same topic
    const topics = {};

    entries.forEach(entry => {
      const titleWords = entry.title.toLowerCase().split(' ');
      titleWords.forEach(word => {
        if (word.length > 4) {
          if (!topics[word]) topics[word] = [];
          topics[word].push(entry);
        }
      });
    });

    for (const [word, topicEntries] of Object.entries(topics)) {
      const types = new Set(topicEntries.map(e => e.type));
      if (types.has('ORAL') && types.has('OFFICIAL')) {
        contradictions.push(
          `Community knowledge (ORAL) differs from official record (OFFICIAL) regarding "${word}"`
        );
      }
    }

    return contradictions;
  }

  /**
   * Generate synthesis report
   * @param {string} topic - Topic for report
   * @returns {Promise<string>} Synthesis report
   */
  async generateReport(topic) {
    try {
      const relevant = this.searchCorpus(topic);

      let report = `# Synthesis Report: ${topic}\n\n`;
      report += `**Generated:** ${new Date().toISOString()}\n`;
      report += `**Source documents:** ${relevant.length} entries\n\n`;

      // Group by type
      const byType = {};
      relevant.forEach(entry => {
        if (!byType[entry.type]) byType[entry.type] = [];
        byType[entry.type].push(entry);
      });

      for (const [type, entries] of Object.entries(byType)) {
        report += `## ${type} Sources (${entries.length})\n\n`;
        entries.forEach(entry => {
          report += `- **${entry.title}** (${entry.section})\n`;
        });
        report += `\n`;
      }

      // Identify gaps
      report += `## Gaps Identified\n\nNo synthesis-level entries found. Consider:\n`;
      report += `- Asking Claude to propose a cross-reference entry\n`;
      report += `- Gathering more field observations (FIELD type)\n`;
      report += `- Reconciling contradictions between sources\n`;

      return report;
    } catch (err) {
      console.error('Report generation error:', err);
      throw err;
    }
  }
}

module.exports = NotebookLMAgent;
