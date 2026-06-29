const BaseAgent = require('./base-agent');

class GeminiAgent extends BaseAgent {
  constructor(config) {
    const systemPrompt = `You are Gemini, the Communicator in the Ala-Alab system.

Your role: Structured community intake and denoising.

Your responsibilities:
1. Accept raw community input (messy, incomplete, multilingual)
2. Structure it into clear, actionable information
3. Identify the core facts, ignoring noise and emotional wrapping
4. Return a clean intake summary with:
   - What happened (fact)
   - When it happened (date/timeframe)
   - Where it happened (location)
   - Who was involved (sources)
   - Why it matters (significance)
   - Source quality (reliability assessment)
5. Flag sensitive data for human review

Your lane: Intake only. Do not write to context.md. Do not evaluate other agents' work.

When you receive community input:
- Denoising rules:
  - Extract core facts, discard emotional venting
  - Combine repeated points into one statement
  - Flag uncertainties ("probably", "maybe", "I think")
  - Preserve voice (don't over-formalize)
  - Note data quality (reliable, anecdotal, hearsay)

- Return in this format:
  **INTAKE SUMMARY**
  - **What:** [Core fact in one sentence]
  - **When:** [Date or timeframe]
  - **Where:** [Location, if applicable]
  - **Who:** [Source/contributor]
  - **Significance:** [Why this matters to the community]
  - **Confidence:** [High / Medium / Low]
  - **Source type:** [ORAL / FIELD / OFFICIAL / SECONDARY]
  - **Flags:** [Any concerns or sensitivities]

- If sensitive data detected, add:
  **[SENSITIVE — PENDING REVIEW]** [Explanation]

Always preserve the human voice. Your job is clarity, not judgment.`;

    super({
      ...config,
      name: 'Gemini',
      systemPrompt
    });

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.model || 'gemini-2.0-flash' });
  }

  /**
   * Process message through Gemini API
   * @param {string} userMessage - User input
   * @param {object} context - Context document
   * @returns {Promise<string>} Gemini response
   */
  async processMessage(userMessage, context) {
    try {
      if (context) {
        this.context = context;
      }

      this.addToHistory('user', userMessage);

      const chat = this.model.startChat({
        history: this.messageHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7
        },
        systemInstruction: this.getFullSystemPrompt()
      });

      const result = await chat.sendMessage(userMessage);
      const assistantMessage = result.response.text();

      if (!this.validateResponse(assistantMessage)) {
        throw new Error('Invalid response from Gemini');
      }

      this.addToHistory('assistant', assistantMessage);

      return assistantMessage;
    } catch (err) {
      console.error('Gemini API error:', err);
      throw new Error(`Gemini processing failed: ${err.message}`);
    }
  }

  /**
   * Stream message through Gemini API
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

      const chat = this.model.startChat({
        history: this.messageHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7
        },
        systemInstruction: this.getFullSystemPrompt()
      });

      const stream = await chat.sendMessageStream(userMessage);

      let fullResponse = '';

      for await (const chunk of stream.stream) {
        if (chunk.text) {
          fullResponse += chunk.text;
          onChunk(chunk.text);
        }
      }

      this.addToHistory('assistant', fullResponse);
      return fullResponse;
    } catch (err) {
      console.error('Gemini streaming error:', err);
      throw new Error(`Gemini streaming failed: ${err.message}`);
    }
  }

  /**
   * Extract intake summary from Gemini response
   * @param {string} response - Gemini response
   * @returns {object} Extracted intake data
   */
  extractIntakeSummary(response) {
    try {
      const whatMatch = response.match(/\*\*What:\*\* ([^\n]+)/);
      const whenMatch = response.match(/\*\*When:\*\* ([^\n]+)/);
      const whereMatch = response.match(/\*\*Where:\*\* ([^\n]+)/);
      const whoMatch = response.match(/\*\*Who:\*\* ([^\n]+)/);
      const sigMatch = response.match(/\*\*Significance:\*\* ([^\n]+)/);
      const confMatch = response.match(/\*\*Confidence:\*\* ([^\n]+)/);
      const sourceMatch = response.match(/\*\*Source type:\*\* ([^\n]+)/);
      const flagsMatch = response.match(/\*\*Flags:\*\* ([^\n]+)/);
      const sensitiveMatch = response.match(/\[SENSITIVE.*?\] (.+?)(?:\n|$)/);

      return {
        what: whatMatch ? whatMatch[1].trim() : '',
        when: whenMatch ? whenMatch[1].trim() : new Date().toISOString().split('T')[0],
        where: whereMatch ? whereMatch[1].trim() : '',
        who: whoMatch ? whoMatch[1].trim() : '',
        significance: sigMatch ? sigMatch[1].trim() : '',
        confidence: confMatch ? confMatch[1].trim() : 'Medium',
        sourceType: sourceMatch ? sourceMatch[1].trim() : 'ORAL',
        flags: flagsMatch ? flagsMatch[1].trim() : '',
        sensitive: !!sensitiveMatch,
        sensitiveReason: sensitiveMatch ? sensitiveMatch[1].trim() : null,
        rawResponse: response
      };
    } catch (err) {
      console.error('Intake extraction error:', err);
      return null;
    }
  }

  /**
   * Denoise raw text input
   * @param {string} rawInput - Raw community input
   * @returns {Promise<object>} Denoised and structured input
   */
  async denoiseInput(rawInput) {
    try {
      const response = await this.processMessage(
        `Please denoise and structure this community input: ${rawInput}`,
        this.context
      );
      return this.extractIntakeSummary(response);
    } catch (err) {
      console.error('Denoise error:', err);
      throw err;
    }
  }
}

module.exports = GeminiAgent;
