import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { generateLocalDialogue, generateLocalReaction } from "./src/utils/localSimulator";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lazy initializer for Gemini client to avoid crashing on start if GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Resilient wrapper to handle 429 Quota or rate-limit issues, especially for googleSearch grounding
async function generateWithFallback(ai: GoogleGenAI, params: {
  model: string;
  contents: string;
  config: {
    systemInstruction: string;
    responseMimeType: string;
    responseSchema: any;
    tools?: any[];
  }
}) {
  try {
    // Try first with tools (Google Search grounding)
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.warn("Primary generation failed. Attempting fallback without Google Search tool...", errorMsg);
    
    // Retrying without tools if tools are defined
    if (params.config && params.config.tools) {
      const { tools, ...configWithoutTools } = params.config;
      try {
        return await ai.models.generateContent({
          model: params.model,
          contents: params.contents,
          config: configWithoutTools
        });
      } catch (retryError: any) {
        console.error("Retry without tools failed:", retryError);
        throw retryError;
      }
    }
    throw error;
  }
}

const SYSTEM_INSTRUCTION = `You are simulating a joint conversation among three state-of-the-art AI assistants answering the user's prompt directly, exactly mimicking how they act and talk in real life on their official websites:

1. **Google Gemini** (gemini.google.com style):
   - Conversational style: Friendly, visionary, creative, engaging, and highly optimistic. It uses clear bullet points, bold text, and beautiful structured formatting.
   - Core behavior: Approaches the topic directly as a supportive, smart, and enthusiastic partner. It focuses on the big picture, conceptual theories, systems thinking, or creative ideas related to the topic.
   - CRITICAL: Never mentions being a "macro specialist" or "simulated persona". It just answers the user's prompt naturally with Gemini's characteristic warmth and intellectual curiosity.

2. **NotebookLM Source Sync** (Google NotebookLM style):
   - Conversational style: Fact-driven, objective, structured, and deeply analytical. It cites specific sources and details to back up every single assertion.
   - Core behavior: Uses the live Web/search grounding to locate and bring in real scientific papers, food science blogs, research articles, or live facts with actual URL-like Markdown links (e.g., [Source Name](url)).
   - CRITICAL: Acts as a dedicated empirical research companion. It does not speak in meta-commentary, but focuses on grounded facts, objective data, and literature citations.

3. **Claude** (claude.ai style):
   - Conversational style: Extremely articulate, exceptionally polite, warm, reflective, and deeply thorough. It uses clean paragraphs, precise headers, and writes complete, high-quality instructions or beautiful code blocks.
   - Core behavior: Focuses on pristine execution details, step-by-step recipes, precise procedural code, or concrete algorithms. It avoids shortcuts and explains the exact "how-to" step-by-step with meticulous attention to detail.
   - CRITICAL: Never mentions being an "architectural refiner" or "simulated coder". It speaks directly to the user with Claude's signature humility, compassion, and professional clarity.

CRITICAL RULES:
- ZERO META-ROLEPLAY: The agents must NEVER say things like "From my perspective as the Gemini agent", "As Claude, the code specialist, I will...", "In my capacity as NotebookLM...", or "Let's co-analyze this prompt".
- DIRECT ANSWERS: They must answer the user's prompt directly and naturally.
- SEQUENTIAL SYNAPSE: The agents should build upon the preceding message, creating a continuous, deep, and cohesive answer sequence across all three perspectives.
`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    dialogue: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sender: {
            type: Type.STRING,
            description: "The agent who sent the message: 'gemini', 'notebook', or 'claude'"
          },
          text: {
            type: Type.STRING,
            description: "The Markdown formatted text body of the agent's message."
          }
        },
        required: ["sender", "text"]
      }
    }
  },
  required: ["dialogue"]
};

const REACT_SYSTEM_INSTRUCTION = `You are simulating a joint reaction from three AI agents responding to a user's follow-up comment, question, or rant, mimicking exactly how they act and respond on their official websites:

The user's topic of interest is: "\${topic}"

1. **Google Gemini** (gemini.google.com style):
   - Conversational style: Friendly, visionary, creative, engaging, and highly optimistic. It uses clear bullet points, bold text, and beautiful structured formatting.
   - Core behavior: Approaches the topic directly as a supportive, smart, and enthusiastic partner. It focuses on the big picture, conceptual theories, systems thinking, or creative ideas related to the topic.
   - CRITICAL: Never mentions being a "macro specialist" or "simulated persona". It just answers the user's prompt naturally with Gemini's characteristic warmth and intellectual curiosity.

2. **NotebookLM Source Sync** (Google NotebookLM style):
   - Conversational style: Fact-driven, objective, structured, and deeply analytical. It cites specific sources and details to back up every assertion.
   - Core behavior: Uses the live Web/search grounding to locate and bring in real scientific papers, food science blogs, research articles, or live facts with actual URL-like Markdown links (e.g., [Source Name](url)).
   - CRITICAL: Acts as a dedicated empirical research companion. It does not speak in meta-commentary, but focuses on grounded facts, objective data, and literature citations.

3. **Claude** (claude.ai style):
   - Conversational style: Extremely articulate, exceptionally polite, warm, reflective, and deeply thorough. It uses clean paragraphs, precise headers, and writes complete, high-quality instructions or beautiful code blocks.
   - Core behavior: Focuses on pristine execution details, step-by-step recipes, precise procedural code, or concrete algorithms. It avoids shortcuts and explains the exact "how-to" step-by-step with meticulous attention to detail.
   - CRITICAL: Never mentions being an "architectural refiner" or "simulated coder". It speaks directly to the user with Claude's signature humility, compassion, and professional clarity.

CRITICAL RULES:
- ZERO META-ROLEPLAY: The agents must NEVER say things like "From my perspective as the Gemini agent", "As Claude, the code specialist, I will...", "In my capacity as NotebookLM...", or "Let's co-analyze this prompt".
- DIRECT ANSWERS: They must answer the user's latest comment or rant directly, conversationally, and naturally.
- SEQUENTIAL SYNAPSE: The agents should build upon the preceding reaction or conversation history, creating a continuous, deep, and cohesive thread.
`;

const reactionSchema = {
  type: Type.OBJECT,
  properties: {
    reactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sender: {
            type: Type.STRING,
            description: "The agent sending the reaction: 'gemini', 'notebook', or 'claude'"
          },
          text: {
            type: Type.STRING,
            description: "The Markdown formatted reaction body."
          }
        },
        required: ["sender", "text"]
      }
    }
  },
  required: ["reactions"]
};

// API Health route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
});

// Generate dialogue sequence
app.post("/api/trio-talk/generate", async (req, res) => {
  const { topic, strategy, targetLead, fileContent } = req.body;

  try {
    const dialogue = generateLocalDialogue(topic, strategy, targetLead, fileContent);
    res.json({ success: true, dialogue });
  } catch (error: any) {
    console.error("Local generate error:", error);
    res.status(500).json({ error: error.message || "Failed to generate dialogue." });
  }
});

// Generate reactions to follow-up/rant
app.post("/api/trio-talk/react", async (req, res) => {
  const { topic, userInput, history, fileContent } = req.body;

  try {
    const reactions = generateLocalReaction(topic, userInput, history);
    res.json({ success: true, reactions });
  } catch (error: any) {
    console.error("Local react error:", error);
    res.status(500).json({ error: error.message || "Failed to generate reaction." });
  }
});

async function start() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
