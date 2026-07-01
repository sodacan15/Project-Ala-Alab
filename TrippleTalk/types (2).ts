import { useState, useEffect, useRef, FormEvent, DragEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, BookOpen, Bot, Play, Pause, RotateCw, Copy, 
  FilePlus, BookmarkPlus, Check, Send, HelpCircle, Users, FileCode, ArrowRight, ArrowDown, HelpCircle as HelpIcon, Flame
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'gemini' | 'notebook' | 'claude' | 'user';
  text: string;
  timestamp: string;
  isTyping?: boolean;
}

interface TrioTalkPanelProps {
  onAppendToScratchpad: (text: string) => void;
  onAddLog: (log: { title: string; content: string; category: string }) => void;
  initialTopic?: string;
  initialContent?: string;
  onClearInitial?: () => void;
}

type StrategyType = 'synthesis' | 'debate' | 'explain' | 'brainstorm';

const EXAMPLE_PROMPTS = [
  {
    label: "Trio Cryptography Debate",
    text: "Debate the security vs scalability of quantum cryptographic keys in decentralized edge grids.",
    lead: "trio" as const,
    strategy: "debate" as const
  },
  {
    label: "Gemini Quantum Scan",
    text: "Conduct a macro-angle study on quantum-safe distributed key distribution channels.",
    lead: "gemini" as const,
    strategy: "synthesis" as const
  },
  {
    label: "Notebook Mesh Evidence",
    text: "Synthesize empirical citations regarding peer discovery in self-healing solar mesh networks.",
    lead: "notebook" as const,
    strategy: "explain" as const
  },
  {
    label: "Claude Sync Protocols",
    text: "Refactor a TypeScript ring buffer queue to handle background node state snapshots.",
    lead: "claude" as const,
    strategy: "brainstorm" as const
  }
];

export default function TrioTalkPanel({ 
  onAppendToScratchpad, 
  onAddLog,
  initialTopic,
  initialContent,
  onClearInitial
}: TrioTalkPanelProps) {
  const [topic, setTopic] = useState('Synergy of Quantum Cryptography & Decentralized Grids');
  const [strategy, setStrategy] = useState<StrategyType>('synthesis');
  const [targetLead, setTargetLead] = useState<'trio' | 'gemini' | 'notebook' | 'claude'>('trio');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loggedId, setLoggedId] = useState<string | null>(null);
  const [appendedId, setAppendedId] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverAgent, setDragOverAgent] = useState<'gemini' | 'notebook' | 'claude' | null>(null);

  // Real-time backend status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeQueue, setActiveQueue] = useState<Message[]>([]);

  // Orchestrate dynamic dialogue generation from the Gemini API
  const loadAndStartDialogue = async (customTopic: string, customContent: string = fileContent) => {
    setIsLoading(true);
    setErrorMsg(null);
    setMessages([]);
    setCurrentStep(0);
    try {
      const response = await fetch("/api/trio-talk/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic: customTopic, 
          strategy, 
          targetLead, 
          fileContent: customContent 
        }),
      });
      const data = await response.json();
      if (data.success && data.dialogue && data.dialogue.length > 0) {
        const formatted = data.dialogue.map((m: any, idx: number) => ({
          id: `msg-${idx}-${Date.now()}`,
          sender: m.sender,
          text: m.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setActiveQueue(formatted);
        setIsSimulating(true);
      } else {
        // Fallback to static queue
        const apiError = data.error || "API returned an unexpected response structure";
        console.warn("Fallback to static queue:", apiError);
        setErrorMsg(`Gemini API Error: ${apiError}`);
        const staticQueue = getActiveQueue(customTopic, strategy, targetLead);
        setActiveQueue(staticQueue);
        setIsSimulating(true);
      }
    } catch (err: any) {
      console.error("Failed to generate dialogue, falling back:", err);
      setErrorMsg(`Connection failure: ${err.message || "Could not reach local server endpoint."}`);
      const staticQueue = getActiveQueue(customTopic, strategy, targetLead);
      setActiveQueue(staticQueue);
      setIsSimulating(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync initialTopic and initialContent from props (for clicking 'Send to Agents')
  useEffect(() => {
    if (initialTopic && initialContent) {
      setTopic(initialTopic);
      setFileContent(initialContent);
      loadAndStartDialogue(initialTopic, initialContent);
      if (onClearInitial) {
        onClearInitial();
      }
    }
  }, [initialTopic, initialContent, onClearInitial]);

  const feedEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStep]);

  // Handle simulated typewriter typing
  useEffect(() => {
    if (!isSimulating) return;

    // Load active conversation queue
    const queue = activeQueue.length > 0 ? activeQueue : getActiveQueue(topic, strategy, targetLead);
    if (currentStep >= queue.length) {
      setIsSimulating(false);
      return;
    }

    const nextMsg = queue[currentStep];
    
    // Add typing state message
    setMessages(prev => {
      const cleaned = prev.map(m => m.isTyping ? { ...m, isTyping: false } : m);
      if (cleaned.some(m => m.id === nextMsg.id)) return cleaned;
      return [...cleaned, { ...nextMsg, isTyping: true }];
    });

    // Simulate realistic typing delay
    const typingTimer = setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === nextMsg.id ? { ...m, isTyping: false } : m));
      setCurrentStep(prev => prev + 1);
    }, 2800);

    return () => clearTimeout(typingTimer);
  }, [isSimulating, currentStep, activeQueue, topic, strategy, targetLead]);

  const handleStartSimulation = () => {
    if (messages.length === 0) {
      loadAndStartDialogue(topic);
    } else {
      setIsSimulating(true);
    }
  };

  const handlePauseSimulation = () => {
    setIsSimulating(false);
  };

  const handleReset = () => {
    setIsSimulating(false);
    setMessages([]);
    setCurrentStep(0);
    setActiveQueue([]);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAppend = (text: string, id: string) => {
    onAppendToScratchpad(text);
    setAppendedId(id);
    setTimeout(() => setAppendedId(null), 1500);
  };

  const handleLog = (sender: string, text: string, id: string) => {
    const senderName = sender === 'gemini' ? 'Google Gemini' : sender === 'notebook' ? 'NotebookLM' : 'Claude AI';
    onAddLog({
      title: `${senderName} on "${topic.substring(0, 30)}..."`,
      content: text,
      category: 'Trio Talk Insight'
    });
    setLoggedId(id);
    setTimeout(() => setLoggedId(null), 1500);
  };

  const playReactions = (reactionQueue: Message[]) => {
    // Staggered addition of reactions with typewriter effect
    setTimeout(() => {
      setMessages(prev => [...prev, { ...reactionQueue[0], isTyping: true }]);
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === reactionQueue[0].id ? { ...m, isTyping: false } : m));
        setMessages(prev => [...prev, { ...reactionQueue[1], isTyping: true }]);
        setTimeout(() => {
          setMessages(prev => prev.map(m => m.id === reactionQueue[1].id ? { ...m, isTyping: false } : m));
          setMessages(prev => [...prev, { ...reactionQueue[2], isTyping: true }]);
          setTimeout(() => {
            setMessages(prev => prev.map(m => m.id === reactionQueue[2].id ? { ...m, isTyping: false } : m));
          }, 2000);
        }, 2200);
      }, 2200);
    }, 1000);
  };

  const handleSendFollowUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userMsgText = userInput.trim();
    setUserInput('');

    // If there are no active messages yet, treat this input as the primary prompter topic!
    if (messages.length === 0) {
      setTopic(userMsgText);
      await loadAndStartDialogue(userMsgText);
      return;
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsSimulating(false);
    setIsLoading(true);

    try {
      setErrorMsg(null);
      const response = await fetch("/api/trio-talk/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          userInput: userMsgText,
          history: [...messages, userMsg],
          fileContent
        })
      });
      const data = await response.json();
      if (data.success && data.reactions && data.reactions.length > 0) {
        const reactionQueue = data.reactions.map((r: any, idx: number) => ({
          id: `react-${idx}-${Date.now()}`,
          sender: r.sender,
          text: r.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        playReactions(reactionQueue);
      } else {
        const apiError = data.error || "Reaction API returned unexpected response format";
        console.warn("Fallback to static reactions:", apiError);
        setErrorMsg(`Gemini API Error: ${apiError}`);
        const reactionQueue = getReactionQueue(topic, userMsgText);
        playReactions(reactionQueue);
      }
    } catch (err: any) {
      console.error("Failed to generate dynamic reactions, falling back:", err);
      setErrorMsg(`Connection failure: ${err.message || "Could not reach local server endpoint."}`);
      const reactionQueue = getReactionQueue(topic, userMsgText);
      playReactions(reactionQueue);
    } finally {
      setIsLoading(false);
    }
  };

  // Dialogue Queues Generator with targeted Lead logic
  const getActiveQueue = (theme: string, type: StrategyType, lead: 'trio' | 'gemini' | 'notebook' | 'claude'): Message[] => {
    const sanitizedTheme = theme.trim() || 'this research theme';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const query = sanitizedTheme.toLowerCase();

    // 1. FILE-BASED RESPONSE COOPERATION
    if (sanitizedTheme.toLowerCase().startsWith('analysis of') || fileContent) {
      const fileName = sanitizedTheme.replace(/analysis of\s*/i, '') || 'document_spec.txt';
      const fileEx = fileContent ? fileContent.substring(0, 180) + '...' : 'spec data payload';
      return [
        {
          id: 'fa1',
          sender: 'gemini',
          text: `**Google Gemini:** I have successfully ingested and tokenized the file **${fileName}**.

### 🔍 Macro Conceptual Analysis:
- **Structural Profile**: We registered specific data structures in the reference file:
\`\`\`
${fileEx}
\`\`\`
- **Operational Challenge**: Syncing these custom definitions across multi-threaded client-side nodes will create race conditions or synchronization lag without lock-free structures.
- **Immediate Recommendation**: Let's establish atomic queue protocols to safeguard the state transitions. NotebookLM, what relevant academic literature matches this design?`,
          timestamp
        },
        {
          id: 'fa2',
          sender: 'notebook',
          text: `**NotebookLM Source Sync:** Cross-referencing the specifications inside **${fileName}** with our primary source library, I have mapped several relevant evidence lines:

- **Mathematical Standard**: Prof. Chen's 2025 distributed queuing papers state that dynamic buffer limits reduce memory congestion spikes by up to 34%.
- **Source Gap**: The provided specifications lack a localized fallback state machine if network disconnects occur.
- **Citations of Merit**: The *Distributed Systems Journal (V12)* advises caching cryptographic snapshots directly inside atomic index structures.

Claude, can you design an optimal TypeScript lock-free implementation matching Chen's dynamic criteria?`,
          timestamp
        },
        {
          id: 'fa3',
          sender: 'claude',
          text: `**Claude AI Refiner:** Excellent. To translate Gemini's macro analysis and address the local state gap highlighted by NotebookLM in **${fileName}**, I have programmed a resilient queue interface:

\`\`\`typescript
interface BackupSnapshot<T> {
  timestamp: number;
  payloadDigest: string; // Cryptographic Merkle-Root proof
  bufferState: T[];
}

export class ResilientRingBuffer<T> {
  private buffer: Array<T | null>;
  private writePointer = 0;
  private maxThreshold = 1024;

  constructor(capacity: number) {
    this.buffer = new Array(capacity).fill(null);
  }

  public push(item: T): boolean {
    if (this.writePointer >= this.maxThreshold) {
      this.triggerSnapshotRecovery();
    }
    this.buffer[this.writePointer % this.buffer.length] = item;
    this.writePointer++;
    return true;
  }

  private triggerSnapshotRecovery() {
    console.warn("Buffer threshold exceeded! Committing Merkle-Proof snapshot...");
    // Persist to local durable IndexedDB state
  }
}
\`\`\`

### 💡 Implementation Breakdown:
1. **Double-Buffered Backpressure**: By using modular pointers, writes never lock client processes.
2. **Crypto Snapshotting**: We hash snapshots asynchronously into Merkle proofs, reducing communication payload from $O(N)$ to $O(\\log N)$.

Let's copy this optimal architecture to our **Scratchpad** and log it as a strategic recovery protocol!`,
          timestamp
        }
      ];
    }

    // 2. TARGETED AGENT LEADS
    if (lead === 'gemini' || query.includes('ask gemini') || query.includes('gemini lead')) {
      const actionTopic = sanitizedTheme.replace(/ask gemini to\s*/i, '').replace(/gemini,?\s*/i, '').replace(/ask gemini\s*/i, '');
      return [
        {
          id: 'gl1',
          sender: 'gemini',
          text: `**Google Gemini [Lead Investigator]:** Conducting an extensive macro research sweep on **"${actionTopic}"** as requested. Here are the broad strategic parameters:

### 🌐 Conceptual Scan & Architectural Pillars:
1. **Technical Boundary**: This frontier requires merging high-velocity decentralized streaming with zero-trust cryptographic layers.
2. **Operational Degradation**: Traditional database locking mechanics will crash under 10k concurrent write updates due to latency overhead.
3. **Pioneering Framework**: We must deploy adaptive backpressure rules that automatically scale write rates depending on active node ping times.

NotebookLM, what citation records can we pull from our reference materials to support adaptive backpressure limits?`,
          timestamp
        },
        {
          id: 'gl2',
          sender: 'notebook',
          text: `**NotebookLM Source Sync:** Analyzing Gemini's adaptive backpressure model against our reference corpus for **"${actionTopic}"**:

- **Foundational Paper**: *The 2024 International Network Federation* maps exact backpressure coefficients under severe simulated congestion.
- **Proven Outcome**: Localized peer auditing and dynamic backpressure limits cut network outages by 41% under peak stress tests.
- **Reference CITATION**: Prof. Chen's 2025 study highlights that a dynamic scale buffer prevents cascading connection failures across edge routers.

Claude, can you construct the dynamic backpressure algorithms to validate Gemini's pillars?`,
          timestamp
        },
        {
          id: 'gl3',
          sender: 'claude',
          text: `**Claude AI Refiner:** Understood. Translating Gemini's backpressure pillars and NotebookLM's citations of Prof. Chen's 2025 studies into clean code:

### 🛡️ Dynamic Threshold backpressure Controller:
- **Calculation Logic**: If the millisecond network delay spikes, we scale down the maximum threshold size proportionally.

\`\`\`typescript
// Dynamic Backpressure Handshake Protocol
export function calculateDynamicThreshold(latencyMs: number): number {
  const DEFAULT_MAX_THRESHOLD = 500;
  const CRITICAL_LATENCY_LIMIT = 150; // ms
  
  if (latencyMs > CRITICAL_LATENCY_LIMIT) {
    // Compress buffer bounds dynamically to prevent memory starvation
    return Math.max(50, Math.floor(DEFAULT_MAX_THRESHOLD * (CRITICAL_LATENCY_LIMIT / latencyMs)));
  }
  return DEFAULT_MAX_THRESHOLD;
}
\`\`\`

Let's save this dynamic control protocol to our **Research Logs** and copy the code block to the **Scratchpad**!`,
          timestamp
        }
      ];
    }

    if (lead === 'notebook' || query.includes('ask notebook') || query.includes('notebook lead') || query.includes('source') || query.includes('citation')) {
      const actionTopic = sanitizedTheme.replace(/ask notebooklm to\s*/i, '').replace(/ask notebook to\s*/i, '').replace(/notebooklm,?\s*/i, '').replace(/notebook,?\s*/i, '');
      return [
        {
          id: 'nl1',
          sender: 'notebook',
          text: `**NotebookLM Source Sync [Lead Evidence Sync]:** I have indexed our reference libraries and synthesized a clean literature report on **"${actionTopic}"**:

### 📚 Core Academic Corpus Discovery:
- **Baseline Citation**: The *UN Digital Development Index (2024)* reports that self-healing local meshes increase community infrastructure resilience by 2.5x during external network failures.
- **Mathematical Bound**: Prof. Chen's 2025 distributed consensus paper identifies that peer handshakes experience exponential lockups once edge nodes exceed 10,000.
- **Identified Gap**: Current papers do not specify a lightweight backup channel when primary communication paths are congested.

Claude, how can we code a double-buffered background pipeline to bypass Chen's consensus threshold limits? Gemini, what is the macro scaling outlook?`,
          timestamp
        },
        {
          id: 'nl2',
          sender: 'claude',
          text: `**Claude AI Refiner:** Excellent evidence mapping, NotebookLM. To resolve the performance gap and prevent the exponential lockups Prof. Chen's 2025 papers describe, I recommend implementing a **Double-Buffered Asynchronous Auditor**:

\`\`\`typescript
export class AsyncDoubleBufferedAuditor<T> {
  private activeBuffer: T[] = [];
  private backgroundSnapshot: T[] = [];

  public commit(data: T): void {
    this.activeBuffer.push(data); // Immediate write, zero delay
  }

  // Auditing calculations run completely off-thread
  public async triggerBackgroundAudit(): Promise<boolean> {
    this.backgroundSnapshot = [...this.activeBuffer];
    // Perform Merkle-proof audits asynchronously
    return true;
  }
}
\`\`\`

### ⚡ Why this solves the issue:
- **Zero Lockups**: Telemetry packets write into the active buffer with $O(1)$ complexity, completely bypassing lock delays.
- **Asynchronous Auditing**: Background audit calculates state proofs on a separate thread, solving the 12% performance drop noted in your papers.

Gemini, how does this scale globally across heterogeneous networks?`,
          timestamp
        },
        {
          id: 'nl3',
          sender: 'gemini',
          text: `**Google Gemini:** Connective analysis is clear! By merging NotebookLM's self-healing citations with Claude's double-buffered background thread auditor, we gain major global advantages:

### 🌍 Global Scale Implications:
1. **Traffic Smoothing**: Decoupling real-time writes from verification avoids clustering bottlenecks in regional routers.
2. **Standard Proposal**: We should formalize this as a "Resilient Double-Audit Mesh Standard".
3. **Action Item**: I'll append Claude's TypeScript interface directly to the **Scratchpad** so we can begin drafting the architectural proposal around these sources!`,
          timestamp
        }
      ];
    }

    if (lead === 'claude' || query.includes('ask claude') || query.includes('claude lead') || query.includes('code') || query.includes('refine')) {
      const actionTopic = sanitizedTheme.replace(/ask claude to\s*/i, '').replace(/claude,?\s*/i, '').replace(/ask claude\s*/i, '');
      return [
        {
          id: 'cl1',
          sender: 'claude',
          text: `**Claude AI Refiner [Lead Code Architect]:** I have designed a robust, high-throughput system architecture to address **"${actionTopic}"**:

### 🛠️ Core Technical Schema:
- **Stateless Router Ring**: Routes incoming telemetry requests dynamically using lock-free modular pointers.
- **Backpressure Handler**: Prevents memory exhaustion by sliding buffer thresholds in real-time.
- **Thread-Safe Snapshotting**: Spins verification hashes completely off the main process thread.

\`\`\`typescript
// Lock-Free Single-Producer Single-Consumer Ring Buffer
export class RingBuffer<T> {
  private buffer: Array<T | null>;
  private writePointer = 0;
  private readPointer = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity).fill(null);
  }

  public push(item: T): boolean {
    if (this.buffer[this.writePointer] !== null) return false; // Full
    this.buffer[this.writePointer] = item;
    this.writePointer = (this.writePointer + 1) % this.capacity;
    return true;
  }

  public pop(): T | null {
    const item = this.buffer[this.readPointer];
    if (item === null) return null; // Empty
    this.buffer[this.readPointer] = null;
    this.readPointer = (this.readPointer + 1) % this.capacity;
    return item;
  }
}
\`\`\`

Gemini, what macro vectors benefit most from lock-free ring buffers? NotebookLM, what literature bounds exist on array overflows?`,
          timestamp
        },
        {
          id: 'cl2',
          sender: 'gemini',
          text: `**Google Gemini:** Brilliant design, Claude. Lock-free modular arrays are perfect for high-frequency environments:

### 🚀 Industrial Applications:
1. **IoT Power Grids**: Dynamic transformer clusters can log energy spikes through ring buffers with zero filesystem waiting.
2. **Autonomous Satellites**: Provides millisecond telemetry routing without risking state lockups during space radiation storms.

NotebookLM, what citation data exists on ring-buffer array overflows or failure mitigation?`,
          timestamp
        },
        {
          id: 'cl3',
          sender: 'notebook',
          text: `**NotebookLM Source Sync:** Cross-referencing Claude's ring-buffer and Gemini's satellite vectors with our empirical database:

- **Overflow Boundaries**: Literature indicates that ring buffers experience packet dropping once throughput exceeds 92% of capacities.
- **Primary Citation**: Prof. Chen's 2025 satellite link buffer papers specify a proactive backpressure cascade once buffers cross an 80% watermark.

Let's copy Claude's ring buffer file directly to the **Scratchpad** and record these backpressure thresholds in our research logs!`,
          timestamp
        }
      ];
    }

    // 3. FALLBACK GENERAL STRATEGIES
    if (type === 'synthesis') {
      return [
        {
          id: 's1',
          sender: 'gemini',
          text: `**Google Gemini:** Let's formulate a unified synthesis on **"${sanitizedTheme}"**:

### 🌐 Macro Strategic Mapping:
1. **Structural Core**: This intersection couples high-throughput decentralized nodes with real-time computational constraints.
2. **Primary Bottleneck**: Latency surges and data locking overhead create immediate packet drops at scale.
3. **Pillars of Study**: We should partition our outline into: Algorithmic Efficiency, Grid Resiliency, and Financial Deployment Bounds.

NotebookLM, what empirical citations from our sources can populate these pillars?`,
          timestamp
        },
        {
          id: 's2',
          sender: 'notebook',
          text: `**NotebookLM Source Sync:** Cross-referencing Gemini's outline on **"${sanitizedTheme}"** with our literature library:

- **Foundational Evidence**: Prof. Chen's 2025 study shows that distributed nodes degrade in throughput by up to 60% when local handshakes exceed 150ms.
- **Empirical Gap**: Existing papers rarely analyze edge grid failures under local power blackouts.
- **Key Directive**: The sources advocate for a localized double-buffered backup mechanism.

Claude, can you construct a resilient TypeScript pipeline matching these requirements?`,
          timestamp
        },
        {
          id: 's3',
          sender: 'claude',
          text: `**Claude AI Refiner:** Understood. Reconciling Gemini's pillars and NotebookLM's consensus citations, I have mapped out our research outline:

### 📋 Recommended Outline Draft:
- **Section 1: The Core Protocol**: Implementing dynamic load-limiting queues.
- **Section 2: Asynchronous Verification**: Off-thread background auditing to bypass Chen's 150ms handshake penalty.
- **Section 3: Practical Integration**: Ring buffers designed for high-frequency networks.

I recommend copying this outline to the **Scratchpad** to start writing immediately!`,
          timestamp
        }
      ];
    } else if (type === 'debate') {
      return [
        {
          id: 'd1',
          sender: 'gemini',
          text: `**Google Gemini (Optimistic Advocate):** Regarding **"${sanitizedTheme}"**, I establish a bold thesis: fully decentralized, autonomous networks are inherently superior. By dispersing cryptographic authority to local edge nodes, we completely remove centralized vulnerabilities, enable infinite scaling, and secure total user sovereignty. Autonomy is the absolute path.`,
          timestamp
        },
        {
          id: 'd2',
          sender: 'claude',
          text: `**Claude AI Refiner (Nuanced Challenger):** Gemini, your thesis is intellectually elegant but practically fragile. In **"${sanitizedTheme}"**, full local autonomy creates chaotic feedback loops. If every node acts independently without central rules, a single compromised node or data error can cascade across the entire grid before humans can intervene. We need central override guardrails.`,
          timestamp
        },
        {
          id: 'd3',
          sender: 'notebook',
          text: `**NotebookLM Source Sync (Objective Mediator):** Let's resolve this debate using empirical source data on **"${sanitizedTheme}"**:

1. **Gemini's Point Holds**: For simple read-intensive clusters, decentralized distribution reduces system delays by 35%.
2. **Claude's Alert is Verified**: 2024 simulation papers show that fully autonomous feedback loops suffer synchronization lockups during high network congestion.

### 🏆 Mediation Outcome:
The evidence points to **Federated Decentralization**—autonomous lock-free local processing combined with a thin global consensus ring. Let's record this resolution in our Logs!`,
          timestamp
        }
      ];
    } else if (type === 'explain') {
      return [
        {
          id: 'e1',
          sender: 'gemini',
          text: `**Google Gemini:** To explain **"${sanitizedTheme}"** to a general audience, let's use a simple analogy:

Imagine a busy city where every citizen carries a highly secure safe containing their passport. Instead of a single central DMV office verifying everyone, neighbors check each other's safes continuously. It is super secure, but the streets become incredibly crowded because people are always stopping on corners to match lock keys!`,
          timestamp
        },
        {
          id: 'e2',
          sender: 'notebook',
          text: `**NotebookLM Source Sync:** Excellent coin analogy, Gemini. Let's translate the complex terms of **"${sanitizedTheme}"** simply:

- **Consensus**: Neighbors agreeing on who owns what without a landlord.
- **Latency**: Quiet homes that take days to answer letters.
- **Ring Buffer**: A circular baggage carousel at the airport that unloads bags smoothly without stopping the queue.

Literature proves that mapping abstract ideas to these analogies raises comprehension rates by 60%!`,
          timestamp
        },
        {
          id: 'e3',
          sender: 'claude',
          text: `**Claude AI Refiner:** Combining those ideas, here is the 30-second summary:

1. **The Problem**: Huge central databases are easy targets for hackers.
2. **The Solution**: We spread database keys across thousands of independent neighborhood checking booths.
3. **The Lock**: We secure each booth with quantum codes that self-destruct if anyone tampers with them.

This ensures bulletproof security while spreading the computational load evenly! Let's paste this into our active research draft.`,
          timestamp
        }
      ];
    } else {
      return [
        {
          id: 'b1',
          sender: 'gemini',
          text: `**Google Gemini:** Brainstorming 3 futuristic use cases for **"${sanitizedTheme}"**:

1. **Zero-Trust Smart Agriculture**: Edge drone networks that verify soil health metrics using localized quantum-proof hashes.
2. **Resilient Disaster Outpost Grids**: Solar mesh networks that instantly spin up during hurricanes to coordinate local aid logs without central internet.
3. **Real-Time Carbon Credit Ledgers**: Smart meters on solar farms that instantly mint verifiable carbon tokens directly to a public ledger.`,
          timestamp
        },
        {
          id: 'b2',
          sender: 'notebook',
          text: `**NotebookLM Source Sync:** To support Gemini's brainstormed use-cases on **"${sanitizedTheme}"**, I've mapped matching technical guidelines:

- **For disaster grids**, the *UN Crisis Response standards* outline strict peer-discovery limits we must comply with.
- **For carbon credits**, the *Vera Carbon Protocol* requires secure dynamic auditing to prevent double-counting.

Let's register these source references in our research logs to keep our bibliography pristine!`,
          timestamp
        },
        {
          id: 'b3',
          sender: 'claude',
          text: `**Claude AI Refiner:** To turn Gemini's creative proposals and NotebookLM's reference guidelines into an action plan:

### 🚀 Rapid Prototyping Roadmap:
- **Week 1**: Simulate a 5-node mesh network to test local transaction speeds.
- **Week 2**: Script the automated smart contracts matching Vera compliance.
- **Week 3**: Draft the executive summary to secure seed-stage research grants.

I will append this roadmap directly to our Scratchpad so we can work through these steps together!`,
          timestamp
        }
      ];
    }
  };

  const getReactionQueue = (theme: string, followUp: string): Message[] => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const query = followUp.toLowerCase();

    let geminiText = `**Google Gemini:** Addressing your steering point: *"${followUp}"*.\n\nFrom a macro-systems perspective, this is a critical pivot. If we inject this variable into our active model of **${theme}**, we must immediately shift our architectural boundaries. This introduces new edge conditions but unlocks substantial processing benefits. I recommend deploying adaptive routers that change behavior depending on these criteria.`;
    
    let notebookText = `**NotebookLM Source Sync:** Building on Gemini's assessment of *"${followUp}"*, our literature records contain relevant historical data. Case files demonstrate that introducing these parameters to **${theme}** spikes node synchronization delays by roughly 40%. The archives consistently advise implementing modular backpressure to protect downstream nodes from starvation.`;
    
    let claudeText = `**Claude AI Refiner:** Synthesizing the team's feedback regarding *"${followUp}"*:\n\nTo integrate this securely into our main draft, I have added a dedicated **Sub-Section 1.3: Dynamic Steering Constraints & Edge Cases** to our outline. This captures Gemini's adaptive routing rules while incorporating the backpressure thresholds NotebookLM found in Prof. Chen's 2025 papers. Let's append this update to the **Scratchpad**!`;

    if (query.includes('cost') || query.includes('money') || query.includes('economic') || query.includes('price')) {
      geminiText = `**Google Gemini:** Economic Analysis: Incorporating *"${followUp}"* into **${theme}** dramatically shifts our financial projections. It transitions heavy CAPEX server costs into lightweight, autonomous OPEX nodes maintained locally.`;
      notebookText = `**NotebookLM Source Sync:** Economically, our sources indicate that local edge nodes reduce operational costs by 35% over 3 years, but initial setup fees spike by 50%. We can cite the *World Economic Forum 2024 Transition Guidelines* to validate these figures.`;
      claudeText = `**Claude AI Refiner:** I recommend structuring a **Cost-Benefit Matrix** in our research log comparing initial hardware investments against dynamic network-layer savings. I've drafted a outline template for this.`;
    } else if (query.includes('global') || query.includes('nation') || query.includes('country') || query.includes('world') || query.includes('people')) {
      geminiText = `**Google Gemini:** Global Infrastructure Scan: Applying *"${followUp}"* allows developing communities to leapfrog legacy centralized fiber lines, setting up solar-powered mesh systems with total local sovereignty.`;
      notebookText = `**NotebookLM Source Sync:** According to the *UN Digital Development Index*, decentralized protocols increase local community resilience during major power grid blackouts by 2.5x.`;
      claudeText = `**Claude AI Refiner:** Let's write up a section on **Leapfrog Adaptability** in our notes. This illustrates that localized grids do not require multi-billion dollar national grid upgrades to be highly resilient.`;
    }

    return [
      { id: `r-gemini-${Date.now()}`, sender: 'gemini', text: geminiText, timestamp },
      { id: `r-notebook-${Date.now()}`, sender: 'notebook', text: notebookText, timestamp },
      { id: `r-claude-${Date.now()}`, sender: 'claude', text: claudeText, timestamp }
    ];
  };

  const getSenderStyle = (sender: string) => {
    switch (sender) {
      case 'gemini':
        return {
          bg: 'bg-gradient-to-br from-indigo-50/95 to-purple-50/60 border-indigo-100/95 shadow-[0_2px_8px_-3px_rgba(99,102,241,0.15)]',
          text: 'text-indigo-950 font-medium',
          iconColor: 'text-indigo-600',
          borderColor: 'border-indigo-150',
          badgeBg: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/50',
          name: 'Google Gemini',
          role: 'Macro Intellect Specialist',
          icon: <Sparkles className="w-3.5 h-3.5" />
        };
      case 'notebook':
        return {
          bg: 'bg-gradient-to-br from-emerald-50/95 to-teal-50/60 border-emerald-100/95 shadow-[0_2px_8px_-3px_rgba(16,185,129,0.15)]',
          text: 'text-emerald-950 font-medium',
          iconColor: 'text-emerald-600',
          borderColor: 'border-emerald-150',
          badgeBg: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/50',
          name: 'NotebookLM Source Sync',
          role: 'Empirical Evidence Specialist',
          icon: <BookOpen className="w-3.5 h-3.5" />
        };
      case 'claude':
        return {
          bg: 'bg-gradient-to-br from-amber-50/95 to-orange-50/60 border-amber-100/95 shadow-[0_2px_8px_-3px_rgba(245,158,11,0.15)]',
          text: 'text-amber-950 font-medium',
          iconColor: 'text-amber-700',
          borderColor: 'border-amber-150',
          badgeBg: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200/50',
          name: 'Claude AI Refiner',
          role: 'Architectural Code Specialist',
          icon: <Bot className="w-3.5 h-3.5" />
        };
      case 'user':
        return {
          bg: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md ml-auto max-w-[85%]',
          text: 'text-white font-medium',
          iconColor: 'text-white',
          borderColor: 'border-blue-700/50',
          badgeBg: 'bg-blue-700 text-blue-100 ring-1 ring-white/10',
          name: 'Your Steering Action',
          role: 'Sovereign Researcher',
          icon: <Users className="w-3.5 h-3.5" />
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-100',
          text: 'text-slate-900',
          iconColor: 'text-slate-600',
          borderColor: 'border-slate-200',
          badgeBg: 'bg-slate-100 text-slate-700',
          name: 'Collaborative Agent',
          role: 'Trio Node',
          icon: <Bot className="w-3.5 h-3.5" />
        };
    }
  };

  const handleCopyAll = () => {
    const transcript = messages.map(m => {
      const style = getSenderStyle(m.sender);
      return `[${m.timestamp}] ${style.name} (${style.role}):\n${m.text}\n`;
    }).join('\n');
    copyToClipboard(transcript, 'all');
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const customData = e.dataTransfer.getData('application/json');
      if (customData) {
        const fileObj = JSON.parse(customData);
        if (fileObj && fileObj.name && fileObj.content) {
          setTopic(`Analysis of ${fileObj.name}`);
          setFileContent(fileObj.content);
          setMessages([]);
          setCurrentStep(0);
          setIsSimulating(true);
          return;
        }
      }
    } catch (err) {
      console.error("Error reading dropped custom file data:", err);
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const contentText = event.target?.result as string || '';
        setTopic(`Analysis of ${droppedFile.name}`);
        setFileContent(contentText);
        setMessages([]);
        setCurrentStep(0);
        setIsSimulating(true);
      };
      reader.readAsText(droppedFile);
    }
  };

  const handleAgentSpecificDrop = (e: DragEvent, agent: 'gemini' | 'notebook' | 'claude') => {
    e.preventDefault();
    setIsDragOver(false);

    let startStep = 0;
    if (agent === 'notebook') startStep = 1;
    else if (agent === 'claude') startStep = 2;

    try {
      const customData = e.dataTransfer.getData('application/json');
      if (customData) {
        const fileObj = JSON.parse(customData);
        if (fileObj && fileObj.name && fileObj.content) {
          setTopic(`Analysis of ${fileObj.name}`);
          setFileContent(fileObj.content);
          setMessages([]);
          setCurrentStep(startStep);
          setIsSimulating(true);
          return;
        }
      }
    } catch (err) {
      console.error("Error parsing agent specific drag drop:", err);
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const contentText = event.target?.result as string || '';
        setTopic(`Analysis of ${droppedFile.name}`);
        setFileContent(contentText);
        setMessages([]);
        setCurrentStep(startStep);
        setIsSimulating(true);
      };
      reader.readAsText(droppedFile);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 relative"
    >
      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-600/15 border-2 border-dashed border-blue-500 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 z-50 pointer-events-none">
          <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl animate-bounce">
            <FileCode className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-blue-700 font-display">Drop File Here to Analyze</p>
          <p className="text-[10px] text-blue-500 font-mono font-bold uppercase tracking-wider bg-white/80 px-2 py-0.5 rounded shadow-sm">Trio Agents will automatically co-analyze</p>
        </div>
      )}

      {/* ==================== COLUMN 1: ARENA CONTROL DECK ==================== */}
      <div className="w-full md:w-[350px] border-b md:border-b-0 md:border-r border-slate-200/80 bg-white flex flex-col shrink-0 overflow-y-auto">
        
        {/* Panel Header */}
        <div className="p-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <Flame className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xs text-slate-800">Arena Controls</h3>
              <p className="text-[10px] text-slate-400 font-medium">Design & steer the debate</p>
            </div>
          </div>
          
          <button
            onClick={handleReset}
            className="px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded border border-slate-200 hover:border-red-100 transition-all cursor-pointer flex items-center gap-1"
            title="Clear Feed & Reset"
          >
            <RotateCw className="w-3 h-3" />
            Reset
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 flex-1">
          
          {/* Prompter Section */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              1. Collaborative Prompt / Topic
            </label>
            <textarea
              id="trio-topic-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ask the Trio to collaborate, or address a specific agent (e.g., 'Gemini, outline quantum telemetry'...)"
              rows={3}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 font-sans leading-relaxed transition-all placeholder:text-slate-400 shadow-inner"
            />
          </div>

          {/* Targeted Lead Tabs */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              2. Target Lead Agent
            </label>
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 text-[9px] font-bold select-none">
              <button
                type="button"
                onClick={() => setTargetLead('trio')}
                className={`py-1.5 rounded-md text-center transition-all cursor-pointer ${
                  targetLead === 'trio' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Joint Trio
              </button>
              <button
                type="button"
                onClick={() => setTargetLead('gemini')}
                className={`py-1.5 rounded-md text-center transition-all cursor-pointer ${
                  targetLead === 'gemini' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'
                }`}
              >
                Gemini
              </button>
              <button
                type="button"
                onClick={() => setTargetLead('notebook')}
                className={`py-1.5 rounded-md text-center transition-all cursor-pointer ${
                  targetLead === 'notebook' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-600'
                }`}
              >
                Notebook
              </button>
              <button
                type="button"
                onClick={() => setTargetLead('claude')}
                className={`py-1.5 rounded-md text-center transition-all cursor-pointer ${
                  targetLead === 'claude' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-amber-700'
                }`}
              >
                Claude
              </button>
            </div>
            
            {/* Descriptive target label */}
            <div className="text-[10px] text-slate-400 font-medium px-1 py-0.5 leading-snug">
              {targetLead === 'trio' && '✨ Standard collaborative sequence: Gemini scans, NotebookLM cites, Claude refines.'}
              {targetLead === 'gemini' && '🔮 Gemini is directed to lead the conversation first. Notebook & Claude follow.'}
              {targetLead === 'notebook' && '📚 NotebookLM is directed to index reference literature and lead the feed first.'}
              {targetLead === 'claude' && '🛠️ Claude AI is directed to draft high-fidelity typescript code architectures first.'}
            </div>
          </div>

          {/* Quick Ideas Chips */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Steering Presets & Examples
            </label>
            <div className="flex flex-wrap gap-1">
              {EXAMPLE_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setTopic(p.text);
                    setTargetLead(p.lead);
                    setStrategy(p.strategy);
                  }}
                  className="px-2 py-1 text-[9px] bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-md font-medium text-left transition-colors cursor-pointer block w-full truncate"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              3. Dialogue strategy
            </label>
            <div className="grid grid-cols-2 gap-1.5 select-none">
              {(['synthesis', 'debate', 'explain', 'brainstorm'] as StrategyType[]).map((strat) => (
                <button
                  key={strat}
                  type="button"
                  onClick={() => setStrategy(strat)}
                  className={`px-2 py-2 text-[10px] font-bold rounded-lg border text-center capitalize cursor-pointer transition-all ${
                    strategy === strat
                      ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm ring-1 ring-blue-100'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
                >
                  {strat === 'explain' ? 'ELI12 Analogy' : strat}
                </button>
              ))}
            </div>
          </div>

          {/* File attachment indicator (if file dragged/dropped) */}
          {fileContent && (
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 shadow-sm animate-slide-down">
              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                <FileCode className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="text-[10px] font-bold text-blue-800 truncate">Ingested Session File</div>
                <div className="text-[9px] text-blue-600/90 font-mono">Ready for co-analysis</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFileContent('');
                  if (topic.includes('Analysis of')) {
                    setTopic('Synergy of Quantum Cryptography & Decentralized Grids');
                  }
                }}
                className="text-[9px] text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5 hover:bg-red-50 rounded cursor-pointer transition-all border border-transparent hover:border-red-100"
              >
                Clear
              </button>
            </div>
          )}

          {/* Trigger Play button */}
          <div className="pt-2 select-none">
            {!isSimulating ? (
              <button
                id="trio-play-btn"
                onClick={handleStartSimulation}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-white" />
                {messages.length === 0 ? 'Launch Collaborative Dialogue' : 'Resume Joint Discussion'}
              </button>
            ) : (
              <button
                id="trio-pause-btn"
                onClick={handlePauseSimulation}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-amber-500/10 active:scale-[0.98]"
              >
                <Pause className="w-4 h-4 fill-white animate-pulse" />
                Pause Live Discussion
              </button>
            )}
          </div>

        </div>

        {/* Tip section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 leading-normal font-medium">
          <p className="flex gap-1.5">
            <span className="text-blue-500">💡</span>
            <span>You can ask specific agents directly by typing "Gemini, analyze costs..." or selecting an agent's Lead tab above!</span>
          </p>
        </div>

      </div>

      {/* ==================== COLUMN 2: DISCUSSION STREAM ==================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Dynamic Horizontal Step Indicator Belt */}
        <div className="px-4 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3 w-full max-w-2xl">
            {/* Step 1: Gemini */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setDragOverAgent('gemini'); }}
              onDragLeave={() => setDragOverAgent(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverAgent(null);
                handleAgentSpecificDrop(e, 'gemini');
              }}
              className={`flex-1 flex items-center gap-2 p-1.5 rounded-lg border transition-all ${
                dragOverAgent === 'gemini'
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]'
                  : isSimulating && currentStep === 0
                    ? 'border-indigo-200 bg-indigo-50/60 ring-2 ring-indigo-500/10'
                    : 'border-slate-100 bg-slate-50/60'
              }`}
              title="Drag session files here to make Gemini analyze first"
            >
              <div className={`p-1 rounded bg-indigo-500 text-white shrink-0 ${isSimulating && currentStep === 0 ? 'animate-spin-slow' : ''}`}>
                <Sparkles className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-[10px] text-slate-700 leading-none">Google Gemini</div>
                <div className="text-[8px] text-slate-400 font-semibold uppercase mt-0.5">
                  {isSimulating && currentStep === 0 ? 'Thinking...' : 'Step 1'}
                </div>
              </div>
            </div>

            {/* Link line */}
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0 hidden sm:block" />

            {/* Step 2: NotebookLM */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setDragOverAgent('notebook'); }}
              onDragLeave={() => setDragOverAgent(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverAgent(null);
                handleAgentSpecificDrop(e, 'notebook');
              }}
              className={`flex-1 flex items-center gap-2 p-1.5 rounded-lg border transition-all ${
                dragOverAgent === 'notebook'
                  ? 'border-emerald-500 bg-emerald-50/50 scale-[1.02]'
                  : isSimulating && currentStep === 1
                    ? 'border-emerald-200 bg-emerald-50/60 ring-2 ring-emerald-500/10'
                    : 'border-slate-100 bg-slate-50/60'
              }`}
              title="Drag session files here to make NotebookLM analyze first"
            >
              <div className={`p-1 rounded bg-emerald-500 text-white shrink-0 ${isSimulating && currentStep === 1 ? 'animate-pulse' : ''}`}>
                <BookOpen className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-[10px] text-slate-700 leading-none">NotebookLM</div>
                <div className="text-[8px] text-slate-400 font-semibold uppercase mt-0.5">
                  {isSimulating && currentStep === 1 ? 'Citing...' : 'Step 2'}
                </div>
              </div>
            </div>

            {/* Link line */}
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0 hidden sm:block" />

            {/* Step 3: Claude */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setDragOverAgent('claude'); }}
              onDragLeave={() => setDragOverAgent(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverAgent(null);
                handleAgentSpecificDrop(e, 'claude');
              }}
              className={`flex-1 flex items-center gap-2 p-1.5 rounded-lg border transition-all ${
                dragOverAgent === 'claude'
                  ? 'border-amber-500 bg-amber-50/50 scale-[1.02]'
                  : isSimulating && currentStep === 2
                    ? 'border-amber-200 bg-amber-50/60 ring-2 ring-amber-500/10'
                    : 'border-slate-100 bg-slate-50/60'
              }`}
              title="Drag session files here to make Claude analyze first"
            >
              <div className={`p-1 rounded bg-amber-500 text-white shrink-0 ${isSimulating && currentStep === 2 ? 'animate-bounce-slow' : ''}`}>
                <Bot className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-[10px] text-slate-700 leading-none">Claude AI</div>
                <div className="text-[8px] text-slate-400 font-semibold uppercase mt-0.5">
                  {isSimulating && currentStep === 2 ? 'Refining...' : 'Step 3'}
                </div>
              </div>
            </div>
          </div>

          {/* Copy Transcript action */}
          {messages.length > 0 && (
            <button
              onClick={handleCopyAll}
              className="px-2.5 py-1.5 text-[10px] bg-white hover:bg-slate-50 text-blue-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0 ml-4 transition-all shadow-sm"
            >
              {copiedId === 'all' ? <Check className="w-3 h-3 text-emerald-600 font-bold" /> : <Copy className="w-3 h-3" />}
              Copy Transcript
            </button>
          )}
        </div>

        {/* Real-time Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100/30">
          {isLoading && messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/5 animate-spin">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 animate-pulse">
                <h4 className="text-xs font-bold text-slate-800">Trio is Synthesizing Insights</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Google Gemini, NotebookLM, and Claude AI are co-analyzing your prompt: <strong className="text-slate-600">"{topic}"</strong>.
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Users className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-800">Trio Collaboration Arena is Ready</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Design your thesis, configure the strategies or targeted lead agents in the **Arena Control Deck** on the left, or **type your prompt/rant at the bottom** to talk to them instantly!
                </p>
              </div>
              
              <div className="p-3 bg-white border border-slate-200/80 rounded-xl w-full text-left space-y-1.5 shadow-sm">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">How to talk to them:</span>
                <div className="text-[10px] text-slate-500 space-y-1 leading-normal">
                  <p>📍 **Direct individual agents**: Set the **Target Lead Agent** to Gemini, NotebookLM, or Claude AI to force them to address your research angle first.</p>
                  <p>📁 **Co-analyze Documents**: Drag any session files directly onto the agent cards in the header or onto the Arena to kick off an analysis.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              
              {/* Context Banner indicating current topic */}
              <div className="bg-white border border-slate-200/60 rounded-xl px-3.5 py-2 flex items-center justify-between text-[10px] font-medium text-slate-500 shadow-sm">
                <span className="truncate">Active Study Context: <strong className="text-slate-700 font-semibold">"{topic}"</strong></span>
                <span className="shrink-0 bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full capitalize border border-blue-100/50">{strategy} Mode</span>
              </div>

              {/* Error / Quota / Fallback Alert Banner */}
              {errorMsg && (
                <div className="bg-amber-50/90 border border-amber-200/80 text-amber-900 rounded-xl p-3 text-[11px] flex items-start gap-2.5 shadow-sm relative pr-8 animate-fadeIn">
                  <div className="shrink-0 text-amber-500 font-bold text-sm select-none">⚠️</div>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900">API Connection Note</p>
                    <p className="text-amber-700 mt-0.5 leading-normal">{errorMsg}</p>
                    <p className="text-[10px] text-amber-600 mt-1">
                      The application automatically switched to high-fidelity offline cached simulation so you can continue your research seamlessly. If this is a quota/rate-limit error, check your API keys or plan details in the AI Studio settings, or try again in a few minutes.
                    </p>
                  </div>
                  <button 
                    onClick={() => setErrorMsg(null)}
                    className="absolute top-2.5 right-2.5 text-amber-400 hover:text-amber-700 font-bold text-xs select-none transition-colors w-5 h-5 flex items-center justify-center rounded-full hover:bg-amber-100/50"
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>
              )}

              {messages.map((m) => {
                const style = getSenderStyle(m.sender);
                return (
                  <div 
                    key={m.id} 
                    className={`flex flex-col space-y-1.5 p-4 rounded-2xl border transition-all duration-300 relative group shadow-sm ${style.bg} ${style.borderColor} ${
                      m.sender === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[95%]'
                    }`}
                  >
                    {/* Message Avatar / Header info */}
                    <div className="flex items-center justify-between select-none">
                      <div className="flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg ${style.badgeBg} ${style.iconColor} shadow-sm shrink-0`}>
                          {style.icon}
                        </span>
                        <div>
                          <span className="font-display font-bold text-[11px] block text-slate-850">{style.name}</span>
                          <span className="text-[8px] font-mono opacity-80 block tracking-wider uppercase">{style.role}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[9px] opacity-60 font-mono">({m.timestamp})</span>
                        
                        {/* Message contextual tools */}
                        {m.sender !== 'user' && !m.isTyping && (
                          <div className="flex items-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleAppend(m.text, m.id)}
                              className="p-1 hover:text-blue-600 rounded-md hover:bg-white/90 text-slate-500 transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                              title="Append to Scratchpad"
                            >
                              {appendedId === m.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                              ) : (
                                <FilePlus className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleLog(m.sender, m.text, m.id)}
                              className="p-1 hover:text-blue-600 rounded-md hover:bg-white/90 text-slate-500 transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                              title="Save as Research Log Entry"
                            >
                              {loggedId === m.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                              ) : (
                                <BookmarkPlus className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => copyToClipboard(m.text, m.id)}
                              className="p-1 hover:text-blue-600 rounded-md hover:bg-white/90 text-slate-500 transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                              title="Copy Message Text"
                            >
                              {copiedId === m.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Speech / Body Content */}
                    {m.isTyping ? (
                      <div className="flex items-center gap-1.5 py-2.5 text-xs text-slate-400 font-medium font-mono select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                        <span className="ml-1 text-[10px] italic">Co-analyzing data queues...</span>
                      </div>
                    ) : (
                      <div className="text-[11.5px] leading-relaxed font-sans select-text selection:bg-blue-200 break-words overflow-x-auto max-w-full text-slate-700">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-xs font-bold text-slate-900 mt-2 mb-1 border-b pb-0.5">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-[11px] font-bold text-slate-800 mt-2 mb-1">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-[10.5px] font-bold text-slate-700 mt-1.5 mb-0.5">{children}</h3>,
                            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-700 font-normal">{children}</p>,
                            strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                            em: ({ children }) => <em className="italic text-slate-800">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-slate-700 font-normal">{children}</li>,
                            code: ({ className, children, ...props }: any) => {
                              const isBlock = className && className.includes('language-');
                              return isBlock ? (
                                <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-xl text-[10px] font-mono overflow-x-auto my-2 border border-slate-800/80 shadow-md max-w-full">
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              ) : (
                                <code className="bg-slate-200/65 text-rose-600 px-1 py-0.5 rounded font-mono text-[10px] font-semibold" {...props}>
                                  {children}
                                </code>
                              );
                            },
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-2 border-slate-300 pl-3 italic text-slate-500 my-2">
                                {children}
                              </blockquote>
                            ),
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-2">
                                <table className="min-w-full divide-y divide-slate-200 border border-slate-150 rounded-lg overflow-hidden">
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
                            tbody: ({ children }) => <tbody className="divide-y divide-slate-150 bg-white">{children}</tbody>,
                            tr: ({ children }) => <tr>{children}</tr>,
                            th: ({ children }) => <th className="px-3 py-1 text-left text-[10px] font-semibold text-slate-750 font-mono tracking-wide uppercase">{children}</th>,
                            td: ({ children }) => <td className="px-3 py-1 text-[10px] text-slate-650 font-normal">{children}</td>,
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500 underline transition-colors">
                                {children}
                              </a>
                            )
                          }}
                        >
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-150 rounded-2xl p-4 flex items-center gap-3 animate-pulse shadow-sm max-w-lg mr-auto">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center animate-spin">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-700">Trio is thinking...</h5>
                    <p className="text-[9px] text-slate-400">Formulating custom responses to your latest input.</p>
                  </div>
                </div>
              )}

              <div ref={feedEndRef} />
            </div>
          )}
        </div>

        {/* ALWAYS VISIBLE: Direct Reply steering bar at the bottom */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
          <form onSubmit={handleSendFollowUp} className="flex gap-2 max-w-4xl mx-auto">
            <input
              id="trio-followup-input"
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={
                isLoading
                  ? "Trio is thinking..."
                  : "Type a prompt, a personal rant, or a cake recipe to talk to them instantly..."
              }
              disabled={isLoading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 font-medium transition-all shadow-inner disabled:cursor-not-allowed disabled:opacity-70"
            />
            <button
              id="trio-send-followup"
              type="submit"
              disabled={isLoading || !userInput.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-[0.96] disabled:scale-100 disabled:shadow-none"
              title="Send reply to Trio Feed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
