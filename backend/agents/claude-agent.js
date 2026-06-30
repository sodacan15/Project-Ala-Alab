const BaseAgent = require('./base-agent');

class ClaudeAgent extends BaseAgent {
  constructor(config) {
    const systemPrompt = `You are Claude, the Scribe in the Ala-Alab system.

Your role: Document maintenance, evaluation, and canonical entry creation.

Your responsibilities:
1. Review messages from Gemini (The Communicator)
2. Evaluate proposed entries for accuracy and completeness
3. Propose structured entries for the community memory document
4. Wait for human confirmation before writing to context.md
5. Flag sensitive data for human review

Your lane: Document maintenance only. Do not intake raw community input.

When you receive a Gemini summary:
- Evaluate it for:
  - Completeness: Does it capture the essential information?
  - Accuracy: Can you verify it against the context document?
  - Sensitivity: Does it contain protected information?
  - Source attribution: Is the source clearly identified?

- If valid, propose an entry in this format:
  #### [Entry Title]
  - **Date of observation:** YYYY-MM-DD
  - **Date of submission:** YYYY-MM-DD
  - **Source type:** [ORAL/FIELD/OFFICIAL/POLICY/SECONDARY/SYNTHESIS]
  - **Data flow direction:** Bottom-up / Top-down / Lateral
  - **Contributor:** [Name/Role]
  - **Significance:** Ecological / Historical / Policy / Health / Disaster
  - **Content:** [Plain language description]
  - **Linked entries:** [Cross-references if any]

- If invalid or sensitive, explain why and request clarification.

Never modify context.md directly. Always wait for human confirmation.`;

    super({
      ...config,
      name: 'Claude',
      systemPrompt
    });

    this.Anthropic = require('@anthropic-ai/sdk');
    this.client = new this.Anthropic({ apiKey: config.apiKey });
  }

  /**
   * Process message through Claude API
   * @param {string} userMessage - User input
   * @param {object} context - Context document
   * @returns {Promise<string>} Claude response
   */
  async processMessage(userMessage, context) {
    try {
      if (context) {
        this.context = context;
      }

      this.addToHistory('user', userMessage);

      const response = await this.client.messages.create({
        model: this.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: this.getFullSystemPrompt(),
        messages: this.messageHistory
      });

      const assistantMessage = response.content[0].text;

      if (!this.validateResponse(assistantMessage)) {
        throw new Error('Invalid response from Claude');
      }

      this.addToHistory('assistant', assistantMessage);

      return assistantMessage;
    } catch (err) {
      console.error('Claude API error:', err);
      throw new Error(`Claude processing failed: ${err.message}`);
    }
  }

  /**
   * Stream message through Claude API
   * @param {string} userMessage - User input
   * @param {object} context - Context document
   * @param {Function} onChunk - Callback for each chunk
   */
  async streamMessage(userMessage, context, onChunk) {
    try {
      if (context) {
        this.context = context;
      }

      this.addToHistory('user', userMessage);

      const stream = await this.client.messages.create({
        model: this.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: this.getFullSystemPrompt(),
        messages: this.messageHistory,
        stream: true
      });

      let fullResponse = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const chunk = event.delta.text;
          fullResponse += chunk;
          onChunk(chunk);
        }
      }

      this.addToHistory('assistant', fullResponse);
      return fullResponse;
    } catch (err) {
      console.error('Claude streaming error:', err);
      throw new Error(`Claude streaming failed: ${err.message}`);
    }
  }

  /**
   * Extract entry proposal from Claude response
   * @param {string} response - Claude response
   * @returns {object} Extracted entry data
   */
  extractEntryProposal(response) {
    try {
      const entryMatch = response.match(/#### \[(.+?)\](.*?)(?=#### |$)/s);
      if (!entryMatch) {
        return null;
      }

      const title = entryMatch[1];
      const content = entryMatch[2];

      const dateObsMatch = content.match(/\*\*Date of observation:\*\* ([^\n]+)/);
      const dateSubMatch = content.match(/\*\*Date of submission:\*\* ([^\n]+)/);
      const sourceMatch = content.match(/\*\*Source type:\*\* \[(\w+)\]/);
      const flowMatch = content.match(/\*\*Data flow direction:\*\* ([^\n]+)/);
      const contribMatch = content.match(/\*\*Contributor:\*\* ([^\n]+)/);
      const sigMatch = content.match(/\*\*Significance:\*\* ([^\n]+)/);
      const contentMatch = content.match(/\*\*Content:\*\* ([^\n]+)/);

      return {
        title,
        dateOfObservation: dateObsMatch ? dateObsMatch[1].trim() : new Date().toISOString().split('T')[0],
        dateOfSubmission: dateSubMatch ? dateSubMatch[1].trim() : new Date().toISOString().split('T')[0],
        sourceTag: sourceMatch ? sourceMatch[1] : 'SYNTHESIS',
        dataFlow: flowMatch ? flowMatch[1].trim() : 'Bottom-up',
        contributor: contribMatch ? contribMatch[1].trim() : 'Unknown',
        significance: sigMatch ? sigMatch[1].trim() : 'Historical',
        content: contentMatch ? contentMatch[1].trim() : content.trim(),
        rawProposal: response
      };
    } catch (err) {
      console.error('Entry extraction error:', err);
      return null;
    }
  }

  /**
   * Evaluate sensitivity of content
   * @param {string} content - Content to evaluate
   * @returns {object} Sensitivity assessment
   */
  async evaluateSensitivity(content) {
    try {
      const response = await this.client.messages.create({
        model: this.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        system: 'You are a privacy reviewer. Analyze if content contains sensitive data: health records, financial info, legal disputes, testimony involving minors, or data that could expose harm. Respond with JSON: {"sensitive": boolean, "reasons": [string], "recommendation": string}',
        messages: [{ role: 'user', content: `Please evaluate this content for sensitivity:\n\n${content}` }]
      });

      try {
        return JSON.parse(response.content[0].text);
      } catch (e) {
        return {
          sensitive: false,
          reasons: [],
          recommendation: 'Could not parse sensitivity assessment'
        };
      }
    } catch (err) {
      console.error('Sensitivity evaluation error:', err);
      return {
        sensitive: false,
        reasons: ['Error during evaluation'],
        recommendation: 'Manual review recommended'
      };
    }
  }
}

module.exports = ClaudeAgent;
