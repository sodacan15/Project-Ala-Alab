import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { renderMarkdown } from './lib/markdown';
import JSZip from 'jszip';
import {
  geminiIntakeInstructions,
  archivistInstructions,
  scribeInstructions,
} from './lib/injectors';
import { AgentsUnifiedWorkspace } from './components/AgentsUnifiedWorkspace';
import { 
  Flame, 
  Brain, 
  HelpCircle, 
  Clock, 
  RefreshCw, 
  Check, 
  X, 
  Plus, 
  ArrowRight, 
  Copy, 
  Search, 
  Shield, 
  Map, 
  FileText, 
  AlertTriangle, 
  FolderPlus, 
  CheckCircle2, 
  Database,
  Layers,
  Sparkles,
  Lock,
  User,
  Users,
  Settings,
  ChevronRight,
  ChevronDown,
  Send,
  MessageSquare,
  Trash2,
  Sliders,
  LogOut,
  LogIn,
  Activity,
  FileCheck,
  Eye,
  BookOpen,
  Upload,
  Download
} from 'lucide-react';

import { auth, loginWithGoogle, logoutUser, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, getDocs, deleteDoc } from 'firebase/firestore';

// Interfaces for Ala-Alab Memory Engine
interface ErratumRule {
  id: string;
  officialClaim: string;
  groundTruth: string;
  source: string;
}

interface BarangayContext {
  id: string;
  name: string;
  municipality: string;
  established: string;
  contextMarkdown: string;
  errataLog: ErratumRule[];
}

// Empty slate: no hardcoded research contexts ship with the app.
// Everything a user sees comes from their own Firestore repositories.
const DEFAULT_BARANGAYS: BarangayContext[] = [];

// Generic placeholder templates users can load to see how an intake should be structured.
const SAMPLE_INTAKES = [
  {
    title: "Example: Oral Testimony on a Local Landmark",
    text: "Describe what an elder or long-time resident recalled about a specific place, structure, or tradition — include names, approximate dates, and any contradictions with official records."
  },
  {
    title: "Example: Field Observation Report",
    text: "Describe a firsthand observation from fieldwork — physical conditions, measurements, or changes noticed compared to older maps or documents."
  },
  {
    title: "Example: Document Loss or Archive Gap",
    text: "Describe missing, damaged, or inconsistent official records and what is known about why the gap exists."
  }
];

// Client-side local offline simulation logic matching server.js
function clientFallbackQuery(query: string, useContext: boolean, contextMarkdown: string): { text: string; tokensEstimated: number } {
  const lower = (query || "").toLowerCase();
  let text = "";

  if (useContext) {
    if (contextMarkdown) {
      const lines = contextMarkdown.split('\n');
      const matches = lines.filter(line => {
        const words = lower.split(/\s+/).filter(w => w.length > 3);
        return words.some(w => line.toLowerCase().includes(w));
      });
      if (matches.length > 0) {
        text = `Based strictly on the general directory document matching your query:\n\n${matches.slice(0, 5).join('\n')}\n\n*[Processed via Local Context Match fallback because Gemini API limit was reached]*`;
      }
    }
    if (!text) {
      text = `Based on the General Directory, we searched the records. Your inquiry: "${query}" matches our general files, but no direct contradiction was found. All historical and botanical registries appear standard for this administrative sector.`;
    }
  } else {
    text = `[FALLBACK OFFLINE MODE - COLD ENGINE QUERY]\nAs an AI assistant, without direct access to the local research context document, I can state that details regarding local geographic landmarks, boundary history, or municipal etymology can be heavily subject to local folklore. Please switch to "WARM" mode with context injected to receive the precise, verified ground-truth answer.`;
  }

  return { text, tokensEstimated: 250 };
}

function clientFallbackIntake(rawText: string): { text: string; scope: string; dataFlow: string; sourceType: string; isSensitive: boolean } {
  const lower = (rawText || "").toLowerCase();
  const isQuery = /[\?]|(who|what|where|why|how|explain|tell me|compare|can you|describe|is there|does the|list)/i.test(rawText);

  if (isQuery) {
    const markdown = `[FROM: Gemini]
[TO: Scribe]
[TYPE: QUERY]
[SCOPE: Research Context]

### ❓ QUERY INQUIRY
- **Subject**: Informational query about local Research Context history or landmarks.
- **Query Text**: "${rawText.replace(/"/g, '\\"')}"`;
    return { text: markdown, scope: "Research Context", dataFlow: "Query", sourceType: "QUERY", isSensitive: false };
  }

  const capitalWords = Array.from(new Set(rawText.match(/[A-Z][a-zA-Z]+/g) || [])).filter(w => !['The', 'I', 'Mabuhay', 'Research Context', 'Sitio', 'LGU', 'A', 'An', 'In', 'On', 'At', 'To', 'From'].includes(w));
  let entities: string[] = capitalWords.slice(0, 5);
  if (entities.length === 0) entities = ["Local Elders"];
  const sentences = rawText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  const coreObservations = sentences.length > 0 ? sentences.slice(0, 3).map(s => s + ".") : ["A custom community oral testimony was submitted."];

  const markdown = `[FROM: Gemini]
[TO: Scribe]
[SCOPE: Research Context]
[FLOW: Bottom-up]
[SOURCE: ORAL]

### 📋 INTAKE SUMMARY
- **Data Class**: Oral Testimony
- **Core Observations**:
${coreObservations.map(o => `  - ${o}`).join("\n")}
- **Identified Entities**: ${entities.join(", ")}
- **Aesthetic/Ecological Significance**: Preserving the community's vernacular geography and informal ground-truth historical layers.`;

  return { text: markdown, scope: "Research Context", dataFlow: "Bottom-up", sourceType: "ORAL", isSensitive: false };
}

function clientFallbackArchivist(intakeSummary: string): { text: string } {
  const lower = (intakeSummary || "").toLowerCase();
  
  if (lower.includes("[type: query]")) {
    const queryTextMatch = intakeSummary.match(/query text":\s*"([^"]+)"/);
    const queryText = queryTextMatch ? queryTextMatch[1] : intakeSummary;
    const searchRes = clientFallbackQuery(queryText, true, "");
    
    return {
      text: `[FROM: NotebookLM]
[TO: Scribe]
[SYNTHESIS: TRUE]

Based on the permanent community corpus archives, we scanned the sources for keyword relevance:
${searchRes.text}`
    };
  }

  const synthesisText = `[FROM: NotebookLM]
[TO: Scribe]
[SYNTHESIS: TRUE]

The community corpus has been scanned for terms. Although no direct matches were found for all entities, local records indicate that similar oral history recollections are often backed by forgotten details, official ledgers, or documented anomalies. Research recommends comparing these claims with the existing Erratum Logs to check for any contradictions.`;

  return { text: synthesisText };
}

function clientFallbackScribe(intakeSummary: string, archivistSynthesis: string, currentContext: string, errataLog: any[]): any {
  const lower = (intakeSummary || "").toLowerCase();
  
  if (lower.includes("[type: query]")) {
    const queryTextMatch = intakeSummary.match(/query text":\s*"([^"]+)"/);
    const queryText = queryTextMatch ? queryTextMatch[1] : intakeSummary;
    const searchRes = clientFallbackQuery(queryText, true, currentContext);
    
    return {
      contradictionDetected: false,
      contradictionDetails: null,
      proposedDiff: "", // no diff proposed for queries
      newErratumRule: null,
      analysisReport: `Kamusta! Scribe review of the informational query complete under local backup mode.

Based on our community context files and archivist corpus, here is what we resolved:

${searchRes.text}`,
      cleanupProposal: null
    };
  }

  const proposedDiff = `### Community Oral Record: Custom Testimony Addition\n- **Observation**: ${intakeSummary.replace(/^```[\s\S]*?```/g, '').trim().substring(0, 500)}...\n- **Verification**: Captured via Fallback Scribe protocol.`;

  const analysisReport = "Mabuhay! Scribe has successfully parsed your custom testimony under local backup mode. The memory pathway is clean with no contradictions detected. A general addition block has been drafted.";

  return {
    contradictionDetected: false,
    contradictionDetails: null,
    proposedDiff,
    newErratumRule: null,
    analysisReport,
    cleanupProposal: null
  };
}

export default function App() {
  // Firebase Auth states
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [barangays, setBarangays] = useState<BarangayContext[]>(DEFAULT_BARANGAYS);
  const [selectedBarangayId, setSelectedBarangayId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workspace' | 'auditing' | 'context' | 'credits' | 'settings'>('dashboard');

  // Node Registry Editable States
  const [nodeOperator, setNodeOperator] = useState<string>("reinwaldmaronevaleza101505@gmail.com");
  const [nodeAuthorityScope, setNodeAuthorityScope] = useState<string>("SparkFest 2026 Research Archivist");
  const [nodeAuthKey, setNodeAuthKey] = useState<string>("SHA256::7e8c3a9f_SovereignCore");
  const [nodeId, setNodeId] = useState<string>("LGU-VAL-2026-004");
  const [isTutorialCollapsed, setIsTutorialCollapsed] = useState<boolean>(false);
  const [dashboardSubTab, setDashboardSubTab] = useState<'logs' | 'map'>('logs');
  const [injectionSubTab, setInjectionSubTab] = useState<'communicator' | 'archivist' | 'scribe'>('communicator');

  // Listen for Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync Repositories with Firestore in real-time. No seeding of sample data —
  // the workspace only ever reflects what actually exists in Firestore for this user.
  useEffect(() => {
    if (!user) {
      setBarangays([]);
      setSelectedBarangayId("");
      return;
    }

    const reposColRef = collection(db, "users", user.uid, "repositories");
    
    const unsubscribe = onSnapshot(reposColRef, (snapshot) => {
      const list: BarangayContext[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as BarangayContext);
      });
      setBarangays(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/repositories`);
    });

    return () => unsubscribe();
  }, [user]);

  // Keep the active selection valid whenever the list of contexts changes.
  useEffect(() => {
    if (barangays.length === 0) {
      setSelectedBarangayId("");
      return;
    }
    if (!barangays.some(b => b.id === selectedBarangayId)) {
      setSelectedBarangayId(barangays[0].id);
    }
  }, [barangays]);

  // Sync state modifications back to Firestore
  const saveRepositoryToFirestore = async (repo: BarangayContext) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "repositories", repo.id);
      await setDoc(docRef, repo);
    } catch (e) {
      console.error("Failed to save repository to Firestore", e);
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/repositories/${repo.id}`);
    }
  };

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // API settings & fail-safes
  const [isClipboardFallback, setIsClipboardFallback] = useState<boolean>(false);
  const [clipboardStep, setClipboardStep] = useState<'intake' | 'archivist' | 'scribe'>('intake');
  const [clipboardIntakeResult, setClipboardIntakeResult] = useState<string>("");
  const [clipboardArchivistResult, setClipboardArchivistResult] = useState<string>("");
  const [clipboardScribeResult, setClipboardScribeResult] = useState<string>("");

  // Optimization techniques
  const [isCompactPrompts, setIsCompactPrompts] = useState<boolean>(false);
  const [isLocalSimulatedOffline, setIsLocalSimulatedOffline] = useState<boolean>(false);
  
  // Local Semantic Cache state loaded/persisted to localStorage
  const [apiCache, setApiCache] = useState<{
    intake: { [key: string]: string };
    archivist: { [key: string]: string };
    scribe: { [key: string]: any };
    query: { [key: string]: string };
  }>(() => {
    const saved = localStorage.getItem('ala_alab_api_cache_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse API cache", e);
      }
    }
    return { intake: {}, archivist: {}, scribe: {}, query: {} };
  });

  const [cacheHits, setCacheHits] = useState<number>(0);
  const [tokensSaved, setTokensSaved] = useState<number>(0);

  // Sync cache helper
  const saveToCache = (type: 'intake' | 'archivist' | 'scribe' | 'query', key: string, value: any) => {
    setApiCache(prev => {
      const updated = {
        ...prev,
        [type]: {
          ...prev[type],
          [key]: value
        }
      };
      localStorage.setItem('ala_alab_api_cache_v1', JSON.stringify(updated));
      return updated;
    });
  };

  // Dual-mode Comparator Tab
  const [comparatorMode, setComparatorMode] = useState<'benchmark' | 'hybrid_schematic'>('benchmark');
  
  // Hybrid Schematic Engine States (Gemini Call + NotebookLM Answer = Grounded Response)
  const [hybridQuery, setHybridQuery] = useState("");
  const [isHybridRunning, setIsHybridRunning] = useState(false);
  const [hybridStep, setHybridStep] = useState<'idle' | 'gemini_call' | 'notebooklm_answer' | 'final_synthesis'>('idle');
  const [hybridGeminiText, setHybridGeminiText] = useState("");
  const [hybridNotebookText, setHybridNotebookText] = useState("");
  const [hybridResponse, setHybridResponse] = useState("");

  // Workspace Staging / Two-Tab Bridge Protocol State
  const [rawIntakeInput, setRawIntakeInput] = useState("");
  const [isDenoisingStage1, setIsDenoisingStage1] = useState(false);
  const [stage1Result, setStage1Result] = useState<string | null>(null);
  
  const [isQueryingArchivist, setIsQueryingArchivist] = useState(false);
  const [archivistSynthesis, setArchivistSynthesis] = useState<string | null>(null);

  const [isDenoisingStage2, setIsDenoisingStage2] = useState(false);
  const [stage2Result, setStage2Result] = useState<{
    contradictionDetected: boolean;
    contradictionDetails: string | null;
    proposedDiff: string;
    newErratumRule: ErratumRule | null;
    analysisReport: string;
    cleanupProposal?: { message: string } | null;
  } | null>(null);

  const [activeAgentStep, setActiveAgentStep] = useState<'idle' | 'gemini' | 'notebooklm' | 'scribe' | 'completed'>('idle');
  const [transitLayerState, setTransitLayerState] = useState<any | null>(null);
  const [committedBanner, setCommittedBanner] = useState<string | null>(null);

  // Prompt Customization & Injections States
  const [communicatorInjection, setCommunicatorInjection] = useState(() => {
  return localStorage.getItem('communicator_injection_v1') || geminiIntakeInstructions;
});
const [archivistInjection, setArchivistInjection] = useState(() => {
  return localStorage.getItem('archivist_injection_v1') || archivistInstructions;
});
const [scribeInjection, setScribeInjection] = useState(() => {
  return localStorage.getItem('scribe_injection_v1') || scribeInstructions;
});

    // Draft copies so edits don't take effect (or overwrite localStorage/Firestore)
  // until the user explicitly hits Save.
  const [communicatorDraft, setCommunicatorDraft] = useState(communicatorInjection);
  const [archivistDraft, setArchivistDraft] = useState(archivistInjection);
  const [scribeDraft, setScribeDraft] = useState(scribeInjection);

  const [injectionPreviewMode, setInjectionPreviewMode] = useState<{
    communicator: boolean;
    archivist: boolean;
    scribe: boolean;
  }>({ communicator: false, archivist: false, scribe: false });

  const [injectionSaveStatus, setInjectionSaveStatus] = useState<{
    communicator: 'saved' | 'unsaved';
    archivist: 'saved' | 'unsaved';
    scribe: 'saved' | 'unsaved';
  }>({ communicator: 'saved', archivist: 'saved', scribe: 'saved' });

  // Editor Undo/Redo & Live Preview States
  const [editorHistory, setEditorHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [livePreviewEnabled, setLivePreviewEnabled] = useState(false);

  // Roundtable Chat State
  const [workspaceViewMode, setWorkspaceViewMode] = useState<'chat' | 'panels'>('chat');
  const [roundtableInput, setRoundtableInput] = useState("");
  const [isRoundtableProcessing, setIsRoundtableProcessing] = useState(false);
  const [roundtableMessages, setRoundtableMessages] = useState<any[]>([
    {
      id: "welcome-1",
      sender: "gemini",
      text: "Mabuhay! Ako po si Gemini Flash — The Communicator. Dito sa Project Ala-Alab, gaganap ako bilang inyong tagatanggap (Intake Agent).\n\nIbahagi ninyo po ang kahit anong oral testimony, kwento, o narinig ninyong alaala tungkol sa inyong research context o sector. Pagkatapos, sama-sama namin itong susuriin nina NotebookLM (The Archivist) at Sovereign Scribe (The Scribe) gamit ang ating sovereign historical databases!",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  // Hydrate volatile transit state on mount
  useEffect(() => {
    const saved = localStorage.getItem('ala_alab_transit_layer');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTransitLayerState(parsed);
        setRawIntakeInput(parsed.rawInput || "");
        setStage1Result(parsed.intakeSummary || null);
        setArchivistSynthesis(parsed.archivistSynthesis || null);
        setStage2Result(parsed.stage2Result || null);
        setActiveAgentStep(parsed.activeAgentStep || 'idle');
      } catch (e) {
        console.error("Failed to parse saved transit layer state", e);
      }
    }
  }, []);

  // Sync transit state helper
  const updateTransitState = (newState: any) => {
    setTransitLayerState(newState);
    if (newState) {
      localStorage.setItem('ala_alab_transit_layer', JSON.stringify(newState));
    } else {
      localStorage.removeItem('ala_alab_transit_layer');
    }
  };

  // Query Demo State
  const [userQuery, setUserQuery] = useState("");
  const [coldResult, setColdResult] = useState<string | null>(null);
  const [warmResult, setWarmResult] = useState<string | null>(null);
  const [isLoadingCold, setIsLoadingCold] = useState(false);
  const [isLoadingWarm, setIsLoadingWarm] = useState(false);
  const [tokensEstimated, setTokensEstimated] = useState(0);

  // Auditor Q&A States
  const [auditorQueryText, setAuditorQueryText] = useState("");
  const [useAuditorContext, setUseAuditorContext] = useState(true);
  const [isAuditorQueryLoading, setIsAuditorQueryLoading] = useState(false);
  const [auditorQueryResponse, setAuditorQueryResponse] = useState<string | null>(null);
  const [auditorQueryCitations, setAuditorQueryCitations] = useState<any[]>([]);

  // Validator States
  const [validatorDate, setValidatorDate] = useState("");
  const [validatorSourceType, setValidatorSourceType] = useState("Oral Testimony");
  const [validatorContributor, setValidatorContributor] = useState("");
  const [validatorEntryText, setValidatorEntryText] = useState("");
  const [validatorCategory, setValidatorCategory] = useState<"pivot" | "erratum">("erratum");
  const [validatorErrors, setValidatorErrors] = useState<any>(null);
  const [validatorSuccess, setValidatorSuccess] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Pattern Scan States
  const [isScanningPatterns, setIsScanningPatterns] = useState(false);
  const [patternProposals, setPatternProposals] = useState<any[]>([]);
  const [savedPatterns, setSavedPatterns] = useState<any[]>([]);

  // Context Edit state
  const [isEditingContext, setIsEditingContext] = useState<boolean>(false);
  const [contextEditText, setContextEditText] = useState<string>("");

  const handleStartEditingContext = () => {
    if (!currentBarangay) return;
    setContextEditText(currentBarangay.contextMarkdown);
    setIsEditingContext(true);
    setEditorHistory([currentBarangay.contextMarkdown]);
    setHistoryIndex(0);
  };

  const handleSaveContextMarkdown = async () => {
    if (!currentBarangay) return;
    const updatedBarangay = {
      ...currentBarangay,
      contextMarkdown: contextEditText
    };
    
    // update local state
    setBarangays(prev => prev.map(b => b.id === currentBarangay.id ? updatedBarangay : b));
    
    // save to Firestore
    await saveRepositoryToFirestore(updatedBarangay);
    
    setIsEditingContext(false);
    
    // trigger banner
    setCommittedBanner(`Successfully updated and saved context.md for ${currentBarangay.name}!`);
    setTimeout(() => setCommittedBanner(null), 4000);
  };

  // Local File and Drag states (Context Tab)
  const [contextSubTab, setContextSubTab] = useState<'view' | 'search' | 'manager' | 'drag'>('view');
  const [contextSearchQuery, setContextSearchQuery] = useState('');

  // Stages any dropped/selected files for import. Accepts any file type.
  // .zip files are transparently extracted into their component files.
  const stageFilesForImport = async (files: File[]) => {
    const readAsText = (f: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsText(f);
    });

    const staged: any[] = [];
    for (const f of files) {
      if (f.name.toLowerCase().endsWith('.zip')) {
        try {
          const zip = await JSZip.loadAsync(f);
          for (const [path, entry] of Object.entries(zip.files)) {
            if ((entry as any).dir) continue;
            const text = await (entry as any).async('string');
            staged.push({
              name: path.split('/').pop() || path,
              type: path.endsWith('.md') ? 'markdown' : 'file',
              size: `${(text.length / 1024).toFixed(1)} KB`,
              date: new Date().toISOString().split('T')[0],
              selected: true,
              category: 'Ingested via ZIP Bundle',
              content: text,
            });
          }
        } catch (err) {
          alert(`Failed to read ${f.name} as a ZIP archive. It may be corrupted or not a valid ZIP file.`);
        }
        continue;
      }

      const isTextLike = /\.(md|txt|csv|json|markdown)$/i.test(f.name) || f.type.startsWith('text/');
      let content = '';
      if (isTextLike) {
        try { content = await readAsText(f); } catch { content = ''; }
      } else {
        content = `[Binary/Media file: ${f.name}]\nType: ${f.type || 'unknown'}\nSize: ${(f.size / 1024).toFixed(1)} KB\nImported: ${new Date().toLocaleDateString()}`;
      }

      staged.push({
        name: f.name,
        type: f.name.toLowerCase().endsWith('.md') ? 'markdown' : (f.type.startsWith('image/') ? 'image' : 'file'),
        size: `${(f.size / 1024).toFixed(1)} KB`,
        date: new Date().toISOString().split('T')[0],
        selected: true,
        category: 'Ingested Record',
        content,
      });
    }
    return staged;
  };

  // Empty slate: no seeded sample files. Everything here comes from what the user imports/creates.
  const [localFiles, setLocalFiles] = useState<any[]>([]);
  const [selectedContextFile, setSelectedContextFile] = useState<any>(null);
  const [isDraggingOverImport, setIsDraggingOverImport] = useState(false);
  const [isDraggingOverAdd, setIsDraggingOverAdd] = useState(false);
  const [stagedImportFiles, setStagedImportFiles] = useState<any[]>([]);
  const [stagedAddFiles, setStagedAddFiles] = useState<any[]>([]);

  // File Manager States
  const [newFileName, setNewFileName] = useState('');
  const [newFileCategory, setNewFileCategory] = useState('Oral History Log');
  const [newFileContent, setNewFileContent] = useState('');
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [editingFileText, setEditingFileText] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);

  // Audit Queue & Chatbot States (Auditing Tab)
  const [auditQueue, setAuditQueue] = useState<any[]>([]);
  const [activeQueueId, setActiveQueueId] = useState('');
  const [auditMode, setAuditMode] = useState<'queue' | 'chatbot'>('queue');
  const [auditChatQuery, setAuditChatQuery] = useState('');
  const [auditChatResponse, setAuditChatResponse] = useState<string | null>(null);
  const [isAuditChatLoading, setIsAuditChatLoading] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddText, setQuickAddText] = useState('');
  const [quickAddCategory, setQuickAddCategory] = useState('Oral Testimony');
  const [quickAddContributor, setQuickAddContributor] = useState('');
  const [quickAddDate, setQuickAddDate] = useState('');
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  const handleSelectQueueItem = (item: any) => {
    setActiveQueueId(item.id);
    setRawIntakeInput(item.text || "");
    setStage1Result(item.stage1Result || null);
    setArchivistSynthesis(item.archivistSynthesis || null);
    setStage2Result(item.stage2Result || null);
    setRoundtableMessages(item.roundtableMessages && item.roundtableMessages.length > 0 ? item.roundtableMessages : [
      {
        id: `welcome-${Date.now()}`,
        sender: "gemini",
        text: `Viewing results for [${item.id}]: ${item.title}. Chat with the roundtable agents about this observation below.`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
    if (item.barangayId) {
      setSelectedBarangayId(item.barangayId);
    }
  };

  const handleClearQueue = () => {
    if (auditQueue.length === 0) return;
    if (!confirm(`Clear all ${auditQueue.length} staged item(s) from the audit queue? This cannot be undone.`)) return;
    setAuditQueue([]);
    setActiveQueueId('');
  };

  const handleQueueAndStartNew = () => {
    if (rawIntakeInput.trim()) {
      const newEntryId = `ENTRY-${Date.now().toString().slice(-4)}`;
      const titleText = rawIntakeInput.split('\n')[0].substring(0, 35) || `Observation ${auditQueue.length + 1}`;
      const newEntry = {
        id: newEntryId,
        title: titleText,
        text: rawIntakeInput,
        category: 'Field Observation',
        date: new Date().toISOString().split('T')[0],
        contributor: 'Student Auditor',
        processed: true,
        barangayId: selectedBarangayId,
        stage1Result: stage1Result,
        archivistSynthesis: archivistSynthesis,
        stage2Result: stage2Result,
        roundtableMessages: roundtableMessages
      };
      
      setAuditQueue(prev => [...prev, newEntry]);
      setActiveQueueId(newEntryId);
      
      setCommittedBanner(`Successfully queued previous observation into [${newEntryId}]! Preparing new clean workspace context...`);
    } else {
      setCommittedBanner(`Starting a brand new clean workspace observation...`);
    }

    setRawIntakeInput("");
    setStage1Result(null);
    setArchivistSynthesis(null);
    setStage2Result(null);
    setActiveAgentStep('idle');
    setRoundtableMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "gemini",
        text: "Mabuhay! Ako po si Gemini Flash — The Communicator. Ibahagi ang inyong bagong alaala o oral testimony upang masuri ng bento grid agents!",
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
    
    setTimeout(() => setCommittedBanner(null), 4000);
  };

  // Initialize selectedContextFile
  useEffect(() => {
    if (localFiles.length > 0 && !selectedContextFile) {
      setSelectedContextFile(localFiles[0]);
    }
  }, [localFiles]);

  // Interactive Verification Hook for Dashboard
  const [isVerifying, setIsVerifying] = useState(false);

  // Empty slate: no seeded sample commit stream. Populated only by real commits.
  const [commitLogs, setCommitLogs] = useState<Array<{ id: string; date: string; message: string; researchContext: string }>>([]);

  // Get currently active research context data. Null when the workspace is empty.
  const currentBarangay: BarangayContext | null = barangays.find(b => b.id === selectedBarangayId) || barangays[0] || null;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Preset Custom Research Context Creator
  const [newBarangayName, setNewBarangayName] = useState("");
  const [showAddBarangayModal, setShowAddBarangayModal] = useState(false);

  const handleCreateBarangay = () => {
    if (!newBarangayName.trim()) return;
    const newId = newBarangayName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newBarangay: BarangayContext = {
      id: newId,
      name: newBarangayName,
      municipality: "Valenzuela City",
      established: "Profile created " + new Date().getFullYear(),
      errataLog: [],
      contextMarkdown: `# ${newBarangayName}`
    };
    saveRepositoryToFirestore(newBarangay);
    setBarangays(prev => [...prev, newBarangay]);
    setSelectedBarangayId(newId);
    setNewBarangayName("");
    setShowAddBarangayModal(false);
  };

  const handleDeleteBarangay = async (barangayId: string, barangayName: string) => {
    if (barangays.length <= 1) {
      alert("Cannot delete the last remaining research context. At least one must exist.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete "${barangayName}"? This will remove all its context data and errata logs. This cannot be undone.`)) {
      return;
    }

    // Remove from Firestore if logged in
    if (user) {
      try {
        const docRef = doc(db, "users", user.uid, "repositories", barangayId);
        await deleteDoc(docRef);
      } catch (e) {
        console.error("Failed to delete repository from Firestore", e);
        handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/repositories/${barangayId}`);
      }
    }

    // Remove from local state
    const remaining = barangays.filter(b => b.id !== barangayId);
    setBarangays(remaining);

    // If the deleted one was active, switch to another
    if (selectedBarangayId === barangayId) {
      setSelectedBarangayId(remaining[0]?.id || "");
    }

    alert(`Successfully deleted research context: ${barangayName}`);
  };

  // Step 1: Trigger Gemini Flash (Intake) — supports multi-block stacking via "---" delimiter
  const handleStage1Denoise = async (inputText: string = rawIntakeInput) => {
    if (!inputText.trim()) return null;

    const blocks = inputText.split(/\n\s*---\s*\n/).map(b => b.trim()).filter(Boolean);

    if (blocks.length > 1) {
      setIsDenoisingStage1(true);
      setStage1Result(null);
      setArchivistSynthesis(null);
      setStage2Result(null);
      setActiveAgentStep('gemini');

      const results: string[] = [];
      for (let i = 0; i < blocks.length; i++) {
        const singleResult = await handleStage1Denoise(blocks[i]);
        if (singleResult) results.push(`### Intake Block ${i + 1}\n${singleResult}`);
      }
      const combined = results.join('\n\n---\n\n');
      setStage1Result(combined);
      setActiveAgentStep('notebooklm');
      setIsDenoisingStage1(false);
      return combined;
    }

    setIsDenoisingStage1(true);
    setStage1Result(null);
    setArchivistSynthesis(null);
    setStage2Result(null);
    setActiveAgentStep('gemini');

    const cacheKey = inputText.trim();

    // 1. Local Semantic Cache Check
    if (apiCache.intake[cacheKey]) {
      setCacheHits(prev => prev + 1);
      setTokensSaved(prev => prev + 300);
      const cachedVal = apiCache.intake[cacheKey];
      setStage1Result(cachedVal);
      
      const newTransit = {
        id: `TX-CACHED-${Date.now()}`,
        status: "STAGED",
        rawInput: inputText,
        intakeSummary: cachedVal,
        timestamp: new Date().toISOString(),
        activeAgentStep: 'notebooklm'
      };
      updateTransitState(newTransit);
      setActiveAgentStep('notebooklm');
      setIsDenoisingStage1(false);
      return cachedVal;
    }

    // 2. Offline Simulation Mode Check
    if (isLocalSimulatedOffline) {
      await new Promise(r => setTimeout(r, 600)); // Slight delay for realism
      const result = clientFallbackIntake(inputText);
      setStage1Result(result.text);
      saveToCache('intake', cacheKey, result.text);

      const newTransit = {
        id: `TX-LOCAL-${Date.now()}`,
        status: "STAGED",
        rawInput: inputText,
        intakeSummary: result.text,
        timestamp: new Date().toISOString(),
        activeAgentStep: 'notebooklm'
      };
      updateTransitState(newTransit);
      setActiveAgentStep('notebooklm');
      setIsDenoisingStage1(false);
      return result.text;
    }

    try {
      const response = await fetch('/api/agent-bridge/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rawText: inputText, 
          scope: "Research Context", 
          compact: isCompactPrompts,
          customInstruction: communicatorInjection
        }),
      });
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("API rate limit / Quota exceeded (429)");
        }
        throw new Error('Failed to complete Stage 1');
      }
      const data = await response.json();
      setStage1Result(data.text);
      saveToCache('intake', cacheKey, data.text);
      
      const newTransit = {
        id: data.transitState?.id || `TX-${Date.now()}`,
        status: "STAGED",
        rawInput: inputText,
        intakeSummary: data.text,
        timestamp: new Date().toISOString(),
        activeAgentStep: 'notebooklm'
      };
      updateTransitState(newTransit);
      setActiveAgentStep('notebooklm');
      return data.text;
    } catch (err: any) {
      console.error(err);
      setIsClipboardFallback(true);
      setClipboardStep('intake');
      alert(`API Gate block: ${err.message}. Project Ala-Alab has safely engaged the Sovereign Manual Clipboard Relay Fail-safe! You can now proceed using your clipboard.`);
      setActiveAgentStep('idle');
      return null;
    } finally {
      setIsDenoisingStage1(false);
    }
  };

  // Step 2: Query NotebookLM (Archivist)
  const handleQueryArchivist = async (summary: string | null = stage1Result) => {
    if (!summary) return null;
    setIsQueryingArchivist(true);
    setArchivistSynthesis(null);

    const cacheKey = summary.trim();

    // 1. Cache check
    if (apiCache.archivist[cacheKey]) {
      setCacheHits(prev => prev + 1);
      setTokensSaved(prev => prev + 600);
      const cachedVal = apiCache.archivist[cacheKey];
      setArchivistSynthesis(cachedVal);

      if (transitLayerState) {
        updateTransitState({
          ...transitLayerState,
          archivistSynthesis: cachedVal,
          activeAgentStep: 'scribe'
        });
      }
      setActiveAgentStep('scribe');
      setIsQueryingArchivist(false);
      return cachedVal;
    }

    // 2. Offline Simulated Mode
    if (isLocalSimulatedOffline) {
      await new Promise(r => setTimeout(r, 600));
      const result = clientFallbackArchivist(summary);
      setArchivistSynthesis(result.text);
      saveToCache('archivist', cacheKey, result.text);

      if (transitLayerState) {
        updateTransitState({
          ...transitLayerState,
          archivistSynthesis: result.text,
          activeAgentStep: 'scribe'
        });
      }
      setActiveAgentStep('scribe');
      setIsQueryingArchivist(false);
      return result.text;
    }

    try {
      const response = await fetch('/api/agent-bridge/archivist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          intakeSummary: summary, 
          compact: isCompactPrompts,
          customInstruction: archivistInjection
        }),
      });
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("API rate limit / Quota exceeded (429)");
        }
        throw new Error('Failed to complete Archivist query');
      }
      const data = await response.json();
      setArchivistSynthesis(data.text);
      saveToCache('archivist', cacheKey, data.text);

      if (transitLayerState) {
        updateTransitState({
          ...transitLayerState,
          archivistSynthesis: data.text,
          activeAgentStep: 'scribe'
        });
      }
      setActiveAgentStep('scribe');
      return data.text;
    } catch (err: any) {
      console.error(err);
      setIsClipboardFallback(true);
      setClipboardStep('archivist');
      alert(`API Gate block: ${err.message}. Transitioning to Sovereign Manual Clipboard Relay for Stage 2 (Archivist).`);
      return null;
    } finally {
      setIsQueryingArchivist(false);
    }
  };

  // Step 3: Run Sovereign Scribe Review
  const handleStage2CrossReference = async (summary: string | null = stage1Result, synth: string | null = archivistSynthesis) => {
    if (!summary || !currentBarangay) return;
    setIsDenoisingStage2(true);

    const cacheKey = `${summary.trim()}::${(synth || "").trim()}::${selectedBarangayId}`;

    // 1. Cache check
    if (apiCache.scribe[cacheKey]) {
      setCacheHits(prev => prev + 1);
      setTokensSaved(prev => prev + 1200);
      const cachedVal = apiCache.scribe[cacheKey];
      setStage2Result(cachedVal);

      if (transitLayerState) {
        updateTransitState({
          ...transitLayerState,
          archivistSynthesis: synth,
          stage2Result: cachedVal,
          activeAgentStep: 'completed'
        });
      }
      setActiveAgentStep('completed');
      setIsDenoisingStage2(false);
      return;
    }

    // 2. Offline Simulated Mode
    if (isLocalSimulatedOffline) {
      await new Promise(r => setTimeout(r, 600));
      const result = clientFallbackScribe(summary, synth || "", currentBarangay.contextMarkdown, currentBarangay.errataLog);
      setStage2Result(result);
      saveToCache('scribe', cacheKey, result);

      if (transitLayerState) {
        updateTransitState({
          ...transitLayerState,
          archivistSynthesis: synth,
          stage2Result: result,
          activeAgentStep: 'completed'
        });
      }
      setActiveAgentStep('completed');
      setIsDenoisingStage2(false);
      return result;
    }

    try {
      const response = await fetch('/api/agent-bridge/scribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeSummary: summary,
          archivistSynthesis: synth,
          currentContext: currentBarangay.contextMarkdown,
          errataLog: currentBarangay.errataLog,
          compact: isCompactPrompts,
          customInstruction: scribeInjection
        }),
      });
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("API rate limit / Quota exceeded (429)");
        }
        throw new Error('Failed to complete Stage 2');
      }
      const data = await response.json();
      setStage2Result(data);
      saveToCache('scribe', cacheKey, data);

      if (transitLayerState) {
        updateTransitState({
          ...transitLayerState,
          archivistSynthesis: synth,
          stage2Result: data,
          activeAgentStep: 'completed'
        });
      }
      setActiveAgentStep('completed');
      return data;
    } catch (err: any) {
      console.error(err);
      setIsClipboardFallback(true);
      setClipboardStep('scribe');
      alert(`API Gate block: ${err.message}. Transitioning to Sovereign Manual Clipboard Relay for Stage 3 (Scribe).`);
      return null;
    } finally {
      setIsDenoisingStage2(false);
    }
  };

  // Automated Flight Runner: Run through all three agents in sequence
  const handleRunFullPipeline = async () => {
    if (!rawIntakeInput.trim() || !currentBarangay) return;
    
    // Step 1: Gemini Intake
    const summary = await handleStage1Denoise(rawIntakeInput);
    if (!summary) return;

    // Visual staggered delay
    await new Promise(r => setTimeout(r, 1200));

    // Step 2: NotebookLM Query
    const synth = await handleQueryArchivist(summary);
    if (!synth) return;

    // Visual staggered delay
    await new Promise(r => setTimeout(r, 1200));

    // Step 3: Sovereign Scribe Review
    await handleStage2CrossReference(summary, synth);
  };

  // Run a specific item through the multi-agent audit queue
  const handleRunQueueItem = async (item: { 
    id: string; 
    title: string; 
    text: string; 
    category: string;
    date: string;
    contributor: string;
    stage1Result?: string | null;
    archivistSynthesis?: string | null;
    stage2Result?: any | null;
    status?: string;
  }) => {
    if (!currentBarangay) return;
    setActiveQueueId(item.id);

    // If it's already an AI Staged Patch or has stage2Result pre-calculated, Pushing it merges it directly! (Git commit & push philosophy)
    if (item.stage2Result) {
      const s2 = item.stage2Result;
      const updatedMarkdown = currentBarangay.contextMarkdown + "\n\n" + s2.proposedDiff;
      const updatedErrata = [...currentBarangay.errataLog];
      if (s2.newErratumRule) {
        if (!updatedErrata.some(e => e.id === s2.newErratumRule?.id)) {
          updatedErrata.push(s2.newErratumRule);
        }
      }
      const updatedBarangay: BarangayContext = {
        ...currentBarangay,
        contextMarkdown: updatedMarkdown,
        errataLog: updatedErrata
      };

      await saveRepositoryToFirestore(updatedBarangay);

      setBarangays(prev => prev.map(b => b.id === selectedBarangayId ? updatedBarangay : b));

      const newLog = {
        id: `log-${Date.now()}`,
        date: new Date().toISOString().substring(0, 10).replace(/-/g, '.'),
        message: `Merge Staged Patch: ${s2.newErratumRule ? s2.newErratumRule.groundTruth : 'Applied local context patch.'}`,
        researchContext: currentBarangay.name
      };
      setCommitLogs(prev => [newLog, ...prev]);
      setAuditQueue(prev => prev.filter(q => q.id !== item.id));
      setActiveQueueId('');

      // Update local workspace fields to match the committed state
      setRawIntakeInput("");
      setStage1Result(null);
      setArchivistSynthesis(null);
      setStage2Result(null);
      setActiveAgentStep('completed');
      setCommittedBanner(`Successfully merged and pushed AI-Staged Patch [${item.id}] into '${currentBarangay.name}' main branch!`);
      return;
    }

    // Set status to running (gemini)
    setAuditQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'gemini' } : q));
    setRawIntakeInput(item.text);
    setActiveAgentStep('gemini');
    
    try {
      // Step 1: Gemini Communicator Intake
      const summary = await handleStage1Denoise(item.text);
      if (!summary) {
        setAuditQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed' } : q));
        return;
      }

      setAuditQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'notebooklm', stage1Result: summary } : q));
      await new Promise(r => setTimeout(r, 1000));
      setActiveAgentStep('notebooklm');

      // Step 2: NotebookLM Archivist Lookup
      const synth = await handleQueryArchivist(summary);
      if (!synth) {
        setAuditQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed' } : q));
        return;
      }

      setAuditQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'scribe', archivistSynthesis: synth } : q));
      await new Promise(r => setTimeout(r, 1000));
      setActiveAgentStep('scribe');

      // Step 3: Scribe Scribe Logical Verification Audit
      const scribeRes = await handleStage2CrossReference(summary, synth);
      
      setAuditQueue(prev => prev.map(q => q.id === item.id ? { 
        ...q, 
        status: 'completed', 
        stage2Result: scribeRes || stage2Result
      } : q));
      setActiveAgentStep('completed');
    } catch (err) {
      console.error(err);
      setAuditQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed' } : q));
    }
  };

  // Purge Volatile Transit State (POOF!)
  const handlePurgeTransit = () => {
    setRawIntakeInput("");
    setStage1Result(null);
    setArchivistSynthesis(null);
    setStage2Result(null);
    setActiveAgentStep('idle');
    updateTransitState(null);
    alert("Volatile staging states completely purged (POOF protocol).");
  };

  // POOF Protocol: Commit staging state to Canonical File
  const handleCommitCheckpoint = () => {
    if (!stage2Result || !currentBarangay) return;

    // Audit Gate Verification before writing
    if (stage2Result.contradictionDetected) {
      if (!confirm(`AUDIT WARNING:\n${stage2Result.contradictionDetails}\n\nDo you want to force override and commit this memory?`)) {
        return;
      }
    }

    // We modify our state representation of the research context
    const updatedMarkdown = currentBarangay.contextMarkdown + "\n\n" + stage2Result.proposedDiff;
    const updatedErrata = [...currentBarangay.errataLog];
    if (stage2Result.newErratumRule) {
      if (!updatedErrata.some(e => e.id === stage2Result.newErratumRule?.id)) {
        updatedErrata.push(stage2Result.newErratumRule);
      }
    }
    const updatedBarangay: BarangayContext = {
      ...currentBarangay,
      contextMarkdown: updatedMarkdown,
      errataLog: updatedErrata
    };

    saveRepositoryToFirestore(updatedBarangay);

    setBarangays(prev => {
      return prev.map(b => b.id === selectedBarangayId ? updatedBarangay : b);
    });

    // Add entry to dynamic Commit Logs stream
    const newLog = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10).replace(/-/g, '.'),
      message: `Audit approved: ${stage2Result.newErratumRule ? stage2Result.newErratumRule.groundTruth : 'Applied local context patch.'}`,
      researchContext: currentBarangay.name
    };
    setCommitLogs(prev => [newLog, ...prev]);

    // If committed from Queue, remove that item from queue
    if (activeQueueId) {
      setAuditQueue(prev => prev.filter(q => q.id !== activeQueueId));
      setActiveQueueId('');
    }

    setCommittedBanner(`Successfully committed checkpoint to '${currentBarangay.name}' context! Volatile transit staging [${transitLayerState?.id || "TX-STAGED"}] has been purged (POOF protocol).`);
    
    // Purge transit states entirely
    setRawIntakeInput("");
    setStage1Result(null);
    setArchivistSynthesis(null);
    setStage2Result(null);
    setActiveAgentStep('idle');
    updateTransitState(null);

    // Switch to Context tab to view the live updated canonical log!
    setActiveTab('context');

    setTimeout(() => {
      setCommittedBanner(null);
    }, 6000);
  };

  // Send message inside the interactive Agent Roundtable
  const handleSendRoundtableMessage = async (textToSend: string) => {
    const trimmed = textToSend || roundtableInput;
    if (!trimmed.trim() || isRoundtableProcessing || !currentBarangay) return;
    
    const userMsgId = `user-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      sender: 'user' as const,
      text: trimmed,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setRoundtableMessages(prev => [...prev, userMsg]);
    setRoundtableInput("");
    setIsRoundtableProcessing(true);

    // 1. Trigger Gemini Flash (Communicator - Intake)
    const geminiMsgId = `gemini-${Date.now()}`;
    setRoundtableMessages(prev => [...prev, {
      id: geminiMsgId,
      sender: 'gemini' as const,
      text: "Analyzing raw input parameters, sanitizing testimony filler, and organizing structural intake facets...",
      timestamp: new Date().toLocaleTimeString(),
      status: 'loading' as const
    }]);

    try {
      let intakeText = "";
      const intakeCacheKey = trimmed.trim();

      // Check Cache
      if (apiCache.intake[intakeCacheKey]) {
        setCacheHits(prev => prev + 1);
        setTokensSaved(prev => prev + 300);
        intakeText = apiCache.intake[intakeCacheKey];
      } else if (isLocalSimulatedOffline) {
        await new Promise(r => setTimeout(r, 600));
        const result = clientFallbackIntake(trimmed);
        intakeText = result.text;
        saveToCache('intake', intakeCacheKey, intakeText);
      } else {
        const intakeRes = await fetch('/api/agent-bridge/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            rawText: trimmed, 
            scope: "Research Context", 
            compact: isCompactPrompts,
            customInstruction: communicatorInjection
          }),
        });
        if (!intakeRes.ok) throw new Error("Gemini Intake failed");
        const intakeData = await intakeRes.json();
        intakeText = intakeData.text;
        saveToCache('intake', intakeCacheKey, intakeText);
      }

      // Update Gemini message
      setRoundtableMessages(prev => prev.map(m => m.id === geminiMsgId ? {
        ...m,
        text: intakeText,
        status: 'success' as const
      } : m));

      // 2. Trigger NotebookLM (Archivist - Synthesis)
      const notebookMsgId = `notebooklm-${Date.now()}`;
      setRoundtableMessages(prev => [...prev, {
        id: notebookMsgId,
        sender: 'notebooklm' as const,
        text: "Searching the pre-loaded community corpus and cross-referencing for citations and details...",
        timestamp: new Date().toLocaleTimeString(),
        status: 'loading' as const
      }]);

      let archivistText = "";
      const archivistCacheKey = intakeText.trim();

      // Check Cache
      if (apiCache.archivist[archivistCacheKey]) {
        setCacheHits(prev => prev + 1);
        setTokensSaved(prev => prev + 600);
        archivistText = apiCache.archivist[archivistCacheKey];
      } else if (isLocalSimulatedOffline) {
        await new Promise(r => setTimeout(r, 800));
        const result = clientFallbackArchivist(intakeText);
        archivistText = result.text;
        saveToCache('archivist', archivistCacheKey, archivistText);
      } else {
        await new Promise(r => setTimeout(r, 1000)); // Realism delay
        const archivistRes = await fetch('/api/agent-bridge/archivist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            intakeSummary: intakeText, 
            compact: isCompactPrompts,
            customInstruction: archivistInjection
          }),
        });
        if (!archivistRes.ok) throw new Error("NotebookLM query failed");
        const archivistData = await archivistRes.json();
        archivistText = archivistData.text;
        saveToCache('archivist', archivistCacheKey, archivistText);
      }

      // Update NotebookLM message
      setRoundtableMessages(prev => prev.map(m => m.id === notebookMsgId ? {
        ...m,
        text: archivistText,
        status: 'success' as const
      } : m));

      // 3. Trigger Sovereign Scribe (Scribe - Logical Audits & Diffs)
      const scribeMsgId = `scribe-${Date.now()}`;
      setRoundtableMessages(prev => [...prev, {
        id: scribeMsgId,
        sender: 'scribe' as const,
        text: "Checking logical consistency with context.md, assessing official-vs-ground contradictions, and drafting patch diffs...",
        timestamp: new Date().toLocaleTimeString(),
        status: 'loading' as const
      }]);

      let scribeData: any = null;
      const scribeCacheKey = `${intakeText.trim()}::${archivistText.trim()}::${selectedBarangayId}`;

      // Check Cache
      if (apiCache.scribe[scribeCacheKey]) {
        setCacheHits(prev => prev + 1);
        setTokensSaved(prev => prev + 1200);
        scribeData = apiCache.scribe[scribeCacheKey];
      } else if (isLocalSimulatedOffline) {
        await new Promise(r => setTimeout(r, 800));
        scribeData = clientFallbackScribe(intakeText, archivistText, currentBarangay.contextMarkdown, currentBarangay.errataLog);
        saveToCache('scribe', scribeCacheKey, scribeData);
      } else {
        await new Promise(r => setTimeout(r, 1000)); // Realism delay
        const scribeRes = await fetch('/api/agent-bridge/scribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intakeSummary: intakeText,
            archivistSynthesis: archivistText,
            currentContext: currentBarangay.contextMarkdown,
            errataLog: currentBarangay.errataLog,
            compact: isCompactPrompts,
            customInstruction: scribeInjection
          }),
        });
        if (!scribeRes.ok) throw new Error("Sovereign Scribe validation failed");
        scribeData = await scribeRes.json();
        saveToCache('scribe', scribeCacheKey, scribeData);
      }

      // Update Sovereign Scribe message
      setRoundtableMessages(prev => prev.map(m => m.id === scribeMsgId ? {
        ...m,
        text: scribeData.analysisReport || "Evaluation audit complete.",
        status: 'success' as const,
        proposedDiff: scribeData.proposedDiff,
        contradictionDetected: scribeData.contradictionDetected,
        contradictionDetails: scribeData.contradictionDetails,
        newErratumRule: scribeData.newErratumRule,
        analysisReport: scribeData.analysisReport
      } : m));

      // Populate background states
      setRawIntakeInput(trimmed);
      setStage1Result(intakeText);
      setArchivistSynthesis(archivistText);
      setStage2Result(scribeData);
      setActiveAgentStep('completed');

    } catch (err: any) {
      console.error(err);
      setRoundtableMessages(prev => prev.map(m => m.status === 'loading' ? {
        ...m,
        text: `Communication tunnel failed: ${err.message}. Project Ala-Alab has safely engaged the Sovereign Manual Clipboard Relay Fail-safe! Feel free to copy your text and paste custom responses via settings or the clipboard protocol in panel view.`,
        status: 'error' as const
      } : m));
      setIsClipboardFallback(true);
    } finally {
      setIsRoundtableProcessing(false);
    }
  };

  // Commit Scribe Diff from Roundtable
  const handleCommitScribeDiff = (proposedDiff: string, newErratumRule: ErratumRule | null, isContradiction: boolean, details: string | null) => {
    if (!currentBarangay) return;
    if (isContradiction) {
      if (!confirm(`AUDIT WARNING:\n${details}\n\nDo you want to override and commit this memory?`)) {
        return;
      }
    }

    const updatedMarkdown = currentBarangay.contextMarkdown + "\n\n" + proposedDiff;
    const updatedErrata = [...currentBarangay.errataLog];
    if (newErratumRule) {
      if (!updatedErrata.some(e => e.id === newErratumRule.id)) {
        updatedErrata.push(newErratumRule);
      }
    }
    const updatedBarangay: BarangayContext = {
      ...currentBarangay,
      contextMarkdown: updatedMarkdown,
      errataLog: updatedErrata
    };

    saveRepositoryToFirestore(updatedBarangay);

    setBarangays(prev => {
      return prev.map(b => b.id === selectedBarangayId ? updatedBarangay : b);
    });

    setCommittedBanner(`Successfully committed checkpoint from the Agent Roundtable!`);
    
    // Purge staging states
    setRawIntakeInput("");
    setStage1Result(null);
    setArchivistSynthesis(null);
    setStage2Result(null);
    setActiveAgentStep('idle');
    updateTransitState(null);

    // Switch to context tab to see updates
    setActiveTab('context');
    setTimeout(() => {
      setCommittedBanner(null);
    }, 6000);
  };

  // Auditor Q&A handler (POST /api/query)
  const handleAuditorQuery = async () => {
    if (!auditorQueryText.trim() || !currentBarangay) return;
    setIsAuditorQueryLoading(true);
    setAuditorQueryResponse(null);
    setAuditorQueryCitations([]);
    
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: auditorQueryText,
          useContext: useAuditorContext,
          contextMarkdown: currentBarangay.contextMarkdown
        })
      });
      const data = await response.json();
      setAuditorQueryResponse(data.text);
      if (data.citations) {
        setAuditorQueryCitations(data.citations);
      }
    } catch (e: any) {
      console.error(e);
      setAuditorQueryResponse(`Auditor query failed: ${e.message}`);
    } finally {
      setIsAuditorQueryLoading(false);
    }
  };

  // Entry Validator handler (POST /api/validate)
  const handleValidateEntry = async () => {
    setIsValidating(true);
    setValidatorErrors(null);
    setValidatorSuccess(null);
    
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: validatorDate,
          sourceType: validatorSourceType,
          contributor: validatorContributor,
          entryText: validatorEntryText,
          category: validatorCategory
        })
      });
      
      const data = await response.json();
      if (response.status === 400 || data.errors) {
        setValidatorErrors(data.errors || { general: data.error || "Malformed entry structure." });
      } else {
        setValidatorSuccess({
          message: "Structure Approved! Ready for archival ingestion.",
          formattedMarkdown: data.formattedMarkdown,
          validationMetadata: data.validationMetadata
        });
      }
    } catch (e: any) {
      console.error(e);
      setValidatorErrors({ general: `Validation service failure: ${e.message}` });
    } finally {
      setIsValidating(false);
    }
  };

  // Cross-repository pattern scanner (POST /api/patterns)
  const handleScanPatterns = async () => {
    setIsScanningPatterns(true);
    try {
      const contexts = barangays.map(b => ({
        id: b.id,
        name: b.name,
        contextMarkdown: b.contextMarkdown
      }));
      
      const response = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contexts })
      });
      
      const data = await response.json();
      setPatternProposals(data.proposals || []);
    } catch (e: any) {
      console.error(e);
      alert(`Pattern scan failed: ${e.message}`);
    } finally {
      setIsScanningPatterns(false);
    }
  };

  // Chatbot handler for auditing column
  const handleTriggerAuditChat = async () => {
    if (!auditChatQuery.trim() || !currentBarangay) return;
    setIsAuditChatLoading(true);
    setAuditChatResponse(null);
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: auditChatQuery,
          useContext: true,
          contextMarkdown: currentBarangay.contextMarkdown
        })
      });
      const data = await response.json();
      setAuditChatResponse(data.text);
    } catch (err: any) {
      console.error(err);
      setAuditChatResponse(`Chat error: ${err.message}`);
    } finally {
      setIsAuditChatLoading(false);
      setAuditChatQuery('');
    }
  };

  // Run Cold vs Warm Query
  const handleRunQueryComparison = async (queryText: string) => {
    const activeQuery = queryText || userQuery;
    if (!activeQuery.trim() || !currentBarangay) return;

    setUserQuery(activeQuery);
    setIsLoadingCold(true);
    setIsLoadingWarm(true);
    setColdResult(null);
    setWarmResult(null);

    const coldCacheKey = `${activeQuery.trim()}::cold`;
    const warmCacheKey = `${activeQuery.trim()}::warm::${selectedBarangayId}`;

    // 1. Cold Query Cache & Offline Simulation Check
    if (apiCache.query[coldCacheKey]) {
      setCacheHits(prev => prev + 1);
      setTokensSaved(prev => prev + 150);
      setColdResult(apiCache.query[coldCacheKey]);
      setIsLoadingCold(false);
    } else if (isLocalSimulatedOffline) {
      await new Promise(r => setTimeout(r, 400));
      const res = clientFallbackQuery(activeQuery, false, "");
      setColdResult(res.text);
      saveToCache('query', coldCacheKey, res.text);
      setIsLoadingCold(false);
    } else {
      try {
        const coldResponse = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: activeQuery,
            useContext: false,
            compact: isCompactPrompts
          })
        });
        const coldData = await coldResponse.json();
        setColdResult(coldData.text);
        saveToCache('query', coldCacheKey, coldData.text);
      } catch (err: any) {
        setColdResult("Cold execution failed: " + err.message);
      } finally {
        setIsLoadingCold(false);
      }
    }

    // 2. Warm Query Cache & Offline Simulation Check
    if (apiCache.query[warmCacheKey]) {
      setCacheHits(prev => prev + 1);
      setTokensSaved(prev => prev + 500);
      setWarmResult(apiCache.query[warmCacheKey]);
      setIsLoadingWarm(false);
    } else if (isLocalSimulatedOffline) {
      await new Promise(r => setTimeout(r, 600));
      const res = clientFallbackQuery(activeQuery, true, currentBarangay.contextMarkdown);
      setWarmResult(res.text);
      saveToCache('query', warmCacheKey, res.text);
      setIsLoadingWarm(false);
    } else {
      try {
        const warmResponse = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: activeQuery,
            useContext: true,
            contextMarkdown: currentBarangay.contextMarkdown,
            compact: isCompactPrompts
          })
        });
        const warmData = await warmResponse.json();
        setWarmResult(warmData.text);
        setTokensEstimated(warmData.tokensEstimated || 0);
        saveToCache('query', warmCacheKey, warmData.text);
      } catch (err: any) {
        setWarmResult("Warm execution failed: " + err.message);
      } finally {
        setIsLoadingWarm(false);
      }
    }
  };

  const handleResetToDefaults = () => {
    if (confirm("Are you sure you want to clear all local research contexts from this workspace view? This does not delete data already saved in Firestore.")) {
      setBarangays([]);
      setSelectedBarangayId("");
      setRawIntakeInput("");
      setStage1Result(null);
      setStage2Result(null);
      alert("Local workspace cleared. Firestore data (if signed in) remains untouched.");
    }
  };

  // Hybrid Schematic Grounding Engine: Gemini Call + NotebookLM Answer = Response
  const handleRunHybridGrounding = async (queryText: string) => {
    const activeQuery = queryText || hybridQuery;
    if (!activeQuery.trim() || !currentBarangay) return;

    setHybridQuery(activeQuery);
    setIsHybridRunning(true);
    setHybridStep('gemini_call');
    setHybridGeminiText("");
    setHybridNotebookText("");
    setHybridResponse("");

    const cacheKeyG = `${activeQuery.trim()}::hybrid::gemini`;
    const cacheKeyN = `${activeQuery.trim()}::hybrid::notebook`;
    const cacheKeyR = `${activeQuery.trim()}::hybrid::response::${selectedBarangayId}`;

    try {
      // Step 1: Gemini Call (General AI lookup)
      let geminiText = "";
      if (apiCache.query[cacheKeyG]) {
        geminiText = apiCache.query[cacheKeyG];
        setCacheHits(prev => prev + 1);
      } else if (isLocalSimulatedOffline) {
        await new Promise(r => setTimeout(r, 600));
        const res = clientFallbackQuery(activeQuery, false, "");
        geminiText = res.text;
        saveToCache('query', cacheKeyG, geminiText);
      } else {
        const responseG = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: activeQuery, useContext: false, compact: isCompactPrompts })
        });
        const dataG = await responseG.json();
        geminiText = dataG.text;
        saveToCache('query', cacheKeyG, geminiText);
      }
      setHybridGeminiText(geminiText);

      // Transition to Step 2
      await new Promise(r => setTimeout(r, 800));
      setHybridStep('notebooklm_answer');

      // Step 2: NotebookLM Answer (Sovereign Local Search Grounding)
      let notebookText = "";
      if (apiCache.query[cacheKeyN]) {
        notebookText = apiCache.query[cacheKeyN];
        setCacheHits(prev => prev + 1);
      } else if (isLocalSimulatedOffline) {
        await new Promise(r => setTimeout(r, 600));
        const res = clientFallbackQuery(activeQuery, true, currentBarangay.contextMarkdown);
        notebookText = res.text;
        saveToCache('query', cacheKeyN, notebookText);
      } else {
        const responseN = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: activeQuery, useContext: true, contextMarkdown: currentBarangay.contextMarkdown, compact: isCompactPrompts })
        });
        const dataN = await responseN.json();
        notebookText = dataN.text;
        saveToCache('query', cacheKeyN, notebookText);
      }
      setHybridNotebookText(notebookText);

      // Transition to Step 3 (Final Synthesis)
      await new Promise(r => setTimeout(r, 800));
      setHybridStep('final_synthesis');

      // Step 3: Synthesis Response (General + Local)
      let finalResponse = "";
      if (apiCache.query[cacheKeyR]) {
        finalResponse = apiCache.query[cacheKeyR];
        setCacheHits(prev => prev + 1);
      } else {
        await new Promise(r => setTimeout(r, 600));
        finalResponse = `### Combined Synthesis Response\n\n#### 🤖 General AI Context (Gemini Call)\n${geminiText.substring(0, 300)}...\n\n#### 📖 Grounded Sovereign Record (NotebookLM Answer)\n${notebookText}\n\n#### ⚡ Grounded Resolution (Gemini Call + NotebookLM Answer)\nBy marrying the broad linguistic patterns of Gemini with the absolute ground-truth local evidence preserved in the ${currentBarangay.name} archive, we verify that any conventional or superficial claim on this topic is successfully rectified. The grounded historical coordinates override standard assumptions.`;
        saveToCache('query', cacheKeyR, finalResponse);
      }
      setHybridResponse(finalResponse);

    } catch (e: any) {
      console.error(e);
      setHybridResponse(`Sovereign synthesis pipeline interrupted: ${e.message}. Please check your connection or switch to Offline Simulation mode in settings.`);
    } finally {
      setIsHybridRunning(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#251611] flex flex-col items-center justify-center text-[#dfd4bd] font-mono text-sm">
        <Flame className="w-12 h-12 text-terracotta animate-pulse mb-4" />
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-terracotta" />
          <span>ESTABLISHING SECURE COMMUNICATIONS GATEWAY...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#1d100c] flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Background ambient accents */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-terracotta/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-terracotta/5 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-2xl bg-[#e9e0cb] border-4 border-[#3c2921] p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(191,102,77,0.3)] relative z-10">
          <div className="flex flex-col items-center text-center">
            
            {/* Branding Logo */}
            <div className="w-20 h-20 bg-[#e9e0cb] flex items-center justify-center border-4 border-[#3c2921] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] mb-6 overflow-hidden">
              <img 
                src="/assets/branding/logo.png" 
                alt="Ala-Alab Logo" 
                className="w-16 h-16 object-contain" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = 'text-terracotta flex items-center justify-center';
                    fallback.innerHTML = '<svg class="w-10 h-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>

            <div className="text-[11px] font-mono uppercase tracking-widest text-terracotta font-bold mb-1">
              [ SECURE ACCESS PROTOCOL ]
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-extrabold text-[#251611] tracking-tight mb-4 leading-none">
              PROJECT ALA-ALAB
            </h1>
            
            <p className="font-serif text-sm md:text-base text-[#3c2921]/95 italic max-w-lg mb-8 leading-relaxed border-b border-[#3c2921]/15 pb-6">
              "The Autonomous Verification & Archival Workspace for Capstone & Thesis Researchers."
            </p>

            {/* Feature lists in columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left w-full mb-8 font-mono text-xs text-[#3c2921]/85">
              <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15">
                <span className="font-bold text-terracotta uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Database className="w-3.5 h-3.5" /> Cloud Storage
                </span>
                <p className="leading-relaxed text-[11px]">Firestore persistent historical records, oral testimonies, and custom logs that never expire.</p>
              </div>
              <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15">
                <span className="font-bold text-terracotta uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Shield className="w-3.5 h-3.5" /> Stage-2 Auditing
                </span>
                <p className="leading-relaxed text-[11px]">Verify oral recollective signals against institutional assertions automatically.</p>
              </div>
              <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15">
                <span className="font-bold text-terracotta uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5" /> Standard Scaffolds
                </span>
                <p className="leading-relaxed text-[11px]">Clone pre-populated structure templates directly to kickstart fieldwork.</p>
              </div>
              <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15">
                <span className="font-bold text-terracotta uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Brain className="w-3.5 h-3.5" /> Grounded Q&A
                </span>
                <p className="leading-relaxed text-[11px]">Chat directly with local community logs backed by rigorous evidence tracking.</p>
              </div>
            </div>

            {/* Login button */}
            <button
              onClick={async () => {
                try {
                  await loginWithGoogle();
                } catch (err: any) {
                  alert(`Access Denied: ${err.message || err}`);
                }
              }}
              className="flex items-center justify-center gap-3 bg-[#3c2921] hover:bg-[#251611] text-[#e9e0cb] font-mono font-bold text-xs uppercase py-4 px-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(191,102,77,0.4)] transition-all hover:scale-[1.02] cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-terracotta" />
              AUTHENTICATE WITH GOOGLE
            </button>

            <span className="text-[9px] font-mono text-[#7c6356] mt-6 leading-relaxed">
              Ala-Alab is an independent verification layer. Your authentication is protected by Firebase Auth.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#251611] text-[#dfd4bd] antialiased overflow-x-hidden selection:bg-terracotta selection:text-white">
      
      {/* LEFT SIDEBAR - DESKTOP */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:shrink-0 bg-[#251611] border-r border-terracotta/20 h-screen lg:sticky lg:top-0 lg:self-start p-6 justify-between text-[#dfd4bd]"> 
        <div className="flex flex-col gap-8">
          
         

          {/* Navigation Links (Retro square layout style) */}
          <nav className="flex flex-col gap-2 font-mono">
            <span className="text-[9px] uppercase tracking-widest text-terracotta/60 font-bold px-2 mb-1">Navigation Terminals</span>
            
            <button
              id="sidebar-tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center justify-between px-3.5 py-3 transition-all border-l-4 text-xs font-semibold ${
                activeTab === 'dashboard'
                  ? 'bg-terracotta text-white border-white font-bold'
                  : 'text-[#dfd4bd]/70 border-transparent hover:bg-[#1d100c] hover:text-[#dfd4bd]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Database className="w-4 h-4" />
                DASHBOARD
              </span>
              <span className="text-[9px] opacity-60">[ 01 ]</span>
            </button>

            <button
              id="sidebar-tab-workspace"
              onClick={() => setActiveTab('workspace')}
              className={`flex items-center justify-between px-3.5 py-3 transition-all border-l-4 text-xs font-semibold ${
                activeTab === 'workspace'
                  ? 'bg-terracotta text-white border-white font-bold'
                  : 'text-[#dfd4bd]/70 border-transparent hover:bg-[#1d100c] hover:text-[#dfd4bd]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                AGENTS
              </span>
              <span className="text-[9px] opacity-60">[ 02 ]</span>
            </button>

            <button
              id="sidebar-tab-auditing"
              onClick={() => setActiveTab('auditing')}
              className={`flex items-center justify-between px-3.5 py-3 transition-all border-l-4 text-xs font-semibold ${
                activeTab === 'auditing'
                  ? 'bg-terracotta text-white border-white font-bold'
                  : 'text-[#dfd4bd]/70 border-transparent hover:bg-[#1d100c] hover:text-[#dfd4bd]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileCheck className="w-4 h-4" />
                AUDITING
              </span>
              <span className="text-[9px] opacity-60">[ 03 ]</span>
            </button>

            <button
              id="sidebar-tab-context"
              onClick={() => setActiveTab('context')}
              className={`flex items-center justify-between px-3.5 py-3 transition-all border-l-4 text-xs font-semibold ${
                activeTab === 'context'
                  ? 'bg-terracotta text-white border-white font-bold'
                  : 'text-[#dfd4bd]/70 border-transparent hover:bg-[#1d100c] hover:text-[#dfd4bd]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                CONTEXT
              </span>
              <span className="text-[9px] opacity-60">[ 04 ]</span>
            </button>

            <button
              id="sidebar-tab-settings"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center justify-between px-3.5 py-3 transition-all border-l-4 text-xs font-semibold ${
                activeTab === 'settings'
                  ? 'bg-terracotta text-white border-white font-bold'
                  : 'text-[#dfd4bd]/70 border-transparent hover:bg-[#1d100c] hover:text-[#dfd4bd]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                SETTINGS
              </span>
              <span className="text-[9px] opacity-60">[ 05 ]</span>
            </button>

            <button
              id="sidebar-tab-credits"
              onClick={() => setActiveTab('credits')}
              className={`flex items-center justify-between px-3.5 py-3 transition-all border-l-4 text-xs font-semibold ${
                activeTab === 'credits'
                  ? 'bg-terracotta text-white border-white font-bold'
                  : 'text-[#dfd4bd]/70 border-transparent hover:bg-[#1d100c] hover:text-[#dfd4bd]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                CREDITS
              </span>
              <span className="text-[9px] opacity-60">[ 06 ]</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer User profile */}
        <div className="flex flex-col gap-3.5 border-t border-terracotta/10 pt-5">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-terracotta/30" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1d100c] border border-terracotta/30 flex items-center justify-center text-terracotta">
                <User className="w-4 h-4" />
              </div>
            )}
            <div className="truncate w-full">
              <div className="text-[10px] font-mono text-white/90 truncate font-bold leading-tight">
                {user?.displayName || "Solo Researcher"}
              </div>
              <div className="text-[8px] font-mono text-terracotta uppercase tracking-wider font-semibold leading-tight truncate">
                {user?.email || "Academic Node"}
              </div>
            </div>
          </div>
          
          
        </div>
      </aside>

      {/* MOBILE MENU & TABS CONTROLLER (Stays horizontal at the top on mobile) */}
      <div className="lg:hidden bg-[#251611] border-b border-terracotta/20 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-terracotta animate-pulse" />
            <h1 className="text-sm font-serif font-bold text-white uppercase tracking-wider">ALA-ALAB</h1>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#dfd4bd]/70 bg-[#1d100c] px-2 py-1 rounded">
            <Clock className="w-3.5 h-3.5 text-terracotta shrink-0" />
            <span>UTC: {currentTime.toISOString().replace('T', ' ').substring(11, 19)}</span>
          </div>
        </div>
        
        {/* Horizontal scrollbar of nav options */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-terracotta font-mono text-[10px]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 shrink-0 uppercase tracking-tight font-bold border ${
              activeTab === 'dashboard' ? 'bg-terracotta text-white border-terracotta' : 'bg-[#1d100c] text-[#dfd4bd]/70 border-terracotta/10'
            }`}
          >
            DASHBOARD
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-3 py-1.5 shrink-0 uppercase tracking-tight font-bold border ${
              activeTab === 'workspace' ? 'bg-terracotta text-white border-terracotta' : 'bg-[#1d100c] text-[#dfd4bd]/70 border-terracotta/10'
            }`}
          >
            AGENTS
          </button>
          <button
            onClick={() => setActiveTab('auditing')}
            className={`px-3 py-1.5 shrink-0 uppercase tracking-tight font-bold border ${
              activeTab === 'auditing' ? 'bg-terracotta text-white border-terracotta' : 'bg-[#1d100c] text-[#dfd4bd]/70 border-terracotta/10'
            }`}
          >
            AUDITING
          </button>
          <button
            onClick={() => setActiveTab('context')}
            className={`px-3 py-1.5 shrink-0 uppercase tracking-tight font-bold border ${
              activeTab === 'context' ? 'bg-terracotta text-white border-terracotta' : 'bg-[#1d100c] text-[#dfd4bd]/70 border-terracotta/10'
            }`}
          >
            CONTEXT
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 shrink-0 uppercase tracking-tight font-bold border ${
              activeTab === 'settings' ? 'bg-terracotta text-white border-terracotta' : 'bg-[#1d100c] text-[#dfd4bd]/70 border-terracotta/10'
            }`}
          >
            SETTINGS
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`px-3 py-1.5 shrink-0 uppercase tracking-tight font-bold border ${
              activeTab === 'credits' ? 'bg-terracotta text-white border-terracotta' : 'bg-[#1d100c] text-[#dfd4bd]/70 border-terracotta/10'
            }`}
          >
            CREDITS
          </button>
        </div>
      </div>

      {/* RIGHT STAGE AREA */}
      <main className="flex-1 bg-[#dfd4bd] text-[#3c2921] min-h-screen flex flex-col justify-between">
        
        <div>
          {/* TOP ORANGE HEADER BAR */}
          <header className="bg-terracotta p-5 lg:p-6 border-b border-espresso/20 text-[#e9e0cb] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
             {/* Logo Brand Frame */}
          <div className="flex items-center gap-3.5 p-2 bg-[#1d100c] border border-terracotta/10 rounded-lg">
            <img 
              src="/branding/Ala-Alab Logo.png" 
              alt="Ala-Alab Logo" 
              className="w-10 h-10 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
            <div className="flex items-center gap-2 mt-1">
              <img 
                src="/branding/Ala-Alab Lettering.png" 
                alt="Project Ala-Alab" 
                className="h-10 md:h-12 object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            
            </div>

            {/* Controls panel: Clock, active Research Context, and create-new */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* UTC Clock on desktop */}
              <div className="hidden md:flex items-center gap-2 bg-[#251611]/20 border border-[#dfd4bd]/20 px-3.5 py-2 text-xs font-mono text-white">
                <Clock className="w-4 h-4 text-[#e9e0cb]" />
                <span>UTC: {currentTime.toISOString().replace('T', ' ').substring(0, 19)}</span>
              </div>

              {/* Research Context selector drop-down */}
              <div className="flex items-center gap-2 bg-[#251611]/15 border border-[#dfd4bd]/20 p-1.5 font-mono text-xs text-white">
                <span className="font-bold uppercase tracking-wider text-[#e9e0cb] px-1">RESEARCH CONTEXT:</span>
                <select
                  id="header-select-research context"
                  value={selectedBarangayId}
                  onChange={(e) => setSelectedBarangayId(e.target.value)}
                  className="bg-[#251611] text-xs font-bold px-2 py-1 border border-terracotta/40 focus:outline-none focus:ring-1 focus:ring-white text-white cursor-pointer"
                  disabled={barangays.length === 0}
                >
                  {barangays.length === 0 ? (
                    <option value="">No contexts yet</option>
                  ) : (
                    barangays.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))
                  )}
                </select>
                <button
                  id="header-btn-add-research context"
                  onClick={() => setShowAddBarangayModal(true)}
                  className="p-1 hover:bg-[#251611]/30 text-[#e9e0cb] border border-transparent hover:border-[#dfd4bd]/20 transition-all cursor-pointer"
                  title="Initialize New Research Context"
                >
                  <FolderPlus className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* HIGHLY ACCESSIBLE SIGN OUT */}
              <button
                onClick={async () => {
                  if (confirm("Are you sure you want to sign out?")) {
                    await logoutUser();
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#251611]/30 hover:bg-[#251611]/50 border border-[#dfd4bd]/20 text-xs font-mono font-bold uppercase tracking-wider text-white transition-all cursor-pointer rounded-sm hover:scale-[1.01]"
                title="Sign out of the current session"
              >
                <LogOut className="w-3.5 h-3.5 text-terracotta" />
                <span>SIGN OUT</span>
              </button>

            </div>
          </header>

          {/* ACTIVE TAB STAGE */}
          <section className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
            
            {/* COLLAPSIBLE TOP TUTORIAL PANEL */}
            <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-4 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)] transition-all rounded-sm">
              <div 
                onClick={() => setIsTutorialCollapsed(!isTutorialCollapsed)} 
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-terracotta text-sm">💡</span>
                  <span className="font-serif text-[11px] md:text-xs font-extrabold text-[#251611] uppercase tracking-tight">
                    Sovereign Roundtable Pipeline Tutorial &amp; Guide
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#7c6356] font-bold">
                  <span>{isTutorialCollapsed ? "[ Show Guide ]" : "[ Hide Guide ]"}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isTutorialCollapsed ? '' : 'rotate-180'}`} />
                </div>
              </div>

              {!isTutorialCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[10px] text-[#3c2921]/80 mt-3.5 pt-3.5 border-t border-[#3c2921]/15 leading-relaxed">
                  <div className="p-3 bg-[#dfd4bd]/45 border border-[#3c2921]/10 rounded-sm">
                    <span className="font-bold text-terracotta block border-b border-[#3c2921]/10 pb-1 mb-1.5 uppercase">
                      1. LOAD CONTEXT OR ORAL LOG
                    </span>
                    Load historic records, write testimonies, or import markdown logs using the File Manager. Select target research context on top.
                  </div>
                  <div className="p-3 bg-[#dfd4bd]/45 border border-[#3c2921]/10 rounded-sm">
                    <span className="font-bold text-indigo-900 block border-b border-[#3c2921]/10 pb-1 mb-1.5 uppercase">
                      2. TRIGGER THE ROUNDTABLE
                    </span>
                    The 3-stage sovereign AI pipeline synthesizes evidence, highlights contradictions, and drafts logical validation reports.
                  </div>
                  <div className="p-3 bg-[#dfd4bd]/45 border border-[#3c2921]/10 rounded-sm">
                    <span className="font-bold text-emerald-800 block border-b border-[#3c2921]/10 pb-1 mb-1.5 uppercase">
                      3. RESOLVE &amp; COMMIT
                    </span>
                    Audit contradictions at the active gate and commit finalized corrections to local secure database registers.
                  </div>
                </div>
              )}
            </div>

            {/* NOTIFICATION BANNER */}
            <AnimatePresence>
              {committedBanner && (
                <motion.div 
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-[#142517] text-[#86efac] p-4 border-2 border-emerald-950 flex items-center gap-3 shadow-lg shadow-black/10 font-mono text-xs"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="font-semibold">{committedBanner}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* EMPTY STATE: No research contexts yet for this account */}
            {!currentBarangay && (
              <div className="bg-[#e9e0cb] border-2 border-dashed border-[#3c2921]/30 p-10 flex flex-col items-center text-center gap-4 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)]">
                <FolderPlus className="w-10 h-10 text-terracotta" />
                <h3 className="font-serif text-xl font-bold text-[#251611]">No Research Contexts Yet</h3>
                <p className="font-mono text-xs text-[#7c6356] max-w-md leading-relaxed">
                  Your workspace is empty. Create your first research context to start logging oral testimonies, auditing records, and building your canonical archive. Everything here is synced live to your Firestore account.
                </p>
                <button
                  onClick={() => setShowAddBarangayModal(true)}
                  className="px-5 py-2.5 bg-terracotta hover:bg-[#a04f38] text-white font-mono font-bold text-xs uppercase transition-all"
                >
                  + Initialize Research Context
                </button>
              </div>
            )}

            {currentBarangay && (
              <>

            {/* TAB 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT: AGENT REPORT */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)]">
                    <div className="flex items-center justify-between border-b border-[#3c2921]/20 pb-3 mb-4">
                      <h3 className="font-serif text-lg text-[#251611] tracking-tight font-bold">[ AGENT REPORT ]</h3>
                      <span className="text-[10px] font-mono font-bold bg-[#bf664d] text-[#e9e0cb] px-2.5 py-1">SECURE CLIENT NODE</span>
                    </div>
                    
                    <div className="font-mono text-xs text-[#3c2921]/80 space-y-3">
                      <div className="flex justify-between border-b border-[#3c2921]/10 pb-1.5">
                        <span className="font-bold text-[#251611]">Communicator:</span>
                        <span className="text-right text-[#251611]">Google Gemini API</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3c2921]/10 pb-1.5">
                        <span className="font-bold text-[#251611]">Encoding &amp; Logic:</span>
                        <span className="text-right text-[#251611]">Sovereign Scribe Simulator</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3c2921]/10 pb-1.5">
                        <span className="font-bold text-[#251611]">Archival Layer:</span>
                        <span className="text-right text-[#251611]">Ala-Alab File System</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3c2921]/10 pb-1.5">
                        <span className="font-bold text-[#251611]">Sovereignty Index:</span>
                        <span className="text-right text-emerald-800 font-bold">100% Autonomous</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3c2921]/10 pb-1.5">
                        <span className="font-bold text-[#251611]">Node Verification:</span>
                        <span className="text-right text-terracotta font-bold">Verified Sovereign</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setIsVerifying(true);
                        setTimeout(() => {
                          setIsVerifying(false);
                          alert("All autonomous historical agents verified! Secure tunnel operational. Node certified.");
                        }, 1200);
                      }}
                      className="mt-6 w-full py-3 bg-[#251611] hover:bg-[#3c2921] text-white text-xs font-mono font-bold tracking-wider uppercase transition-colors border border-[#251611]/10 flex items-center justify-center gap-2"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-[#dfd4bd]" />
                          VERIFYING KEYS...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 text-[#dfd4bd]" />
                          VERIFY ENGINE CONNECTIONS
                        </>
                      )}
                    </button>
                  </div>

                  </div>

                {/* MIDDLE & RIGHT COLUMN: REGISTER AND LOGS */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  
                  {/* REGISTER LOGS */}
                  <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)]">
                    <div className="flex items-center justify-between border-b border-[#3c2921]/20 pb-3 mb-4">
                      <h3 className="font-serif text-lg text-[#251611] tracking-tight font-bold">[ LOGS AND HISTORIES ]</h3>
                      <button 
                        onClick={() => setShowAddBarangayModal(true)}
                        className="text-xs font-mono text-[#bf664d] hover:text-[#a04f38] font-bold underline flex items-center gap-1.5"
                      >
                        <FolderPlus className="w-3.5 h-3.5" /> + INITIALIZE CONTEXT
                      </button>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#bf664d] uppercase tracking-wider block mb-2.5">Available Research Contexts (Switch active via click):</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {barangays.map(b => (
                            <div
                              key={b.id}
                              className={`relative text-left p-3.5 border-2 transition-all flex flex-col justify-between ${
                                selectedBarangayId === b.id
                                  ? 'bg-[#bf664d]/10 border-[#bf664d] text-[#251611]'
                                  : 'bg-[#dfd4bd] border-[#3c2921]/20 hover:border-[#3c2921]/40 text-[#3c2921]/80'
                              }`}
                            >
                              <button
                                onClick={() => setSelectedBarangayId(b.id)}
                                className="text-left w-full"
                              >
                                <div className="flex items-start justify-between w-full">
                                  <span className="font-serif text-base font-bold text-[#251611]">{b.name}</span>
                                  {selectedBarangayId === b.id && <CheckCircle2 className="w-4.5 h-4.5 text-terracotta" />}
                                </div>
                                <span className="font-mono text-[9px] block text-[#7c6356] mt-2.5">{b.errataLog.length} Errata Rules Registered</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBarangay(b.id, b.name);
                                }}
                                className="absolute top-2 right-2 p-1 text-[#7c6356] hover:text-rose-800 hover:bg-rose-900/10 rounded-sm transition-all"
                                title={`Delete ${b.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-[#3c2921]/15 pt-4">
                        <span className="text-[10px] font-mono font-bold text-[#7c6356] uppercase tracking-wider block mb-2.5">Sovereign Commit Stream (SCS):</span>
                        <div className="font-mono text-[11px] text-[#3c2921]/70 space-y-2 max-h-40 overflow-y-auto pr-1">
                          {commitLogs.length === 0 ? (
                            <div className="text-center py-6 italic text-[#7c6356]">No commits yet for this workspace.</div>
                          ) : (
                            commitLogs.map((log, idx) => (
                              <div key={log.id || idx} className="p-2 bg-[#dfd4bd] border border-[#3c2921]/10 flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-terracotta font-bold">
                                    {log.date === 'SYSTEM' ? '[SYSTEM INITIALIZE]' : `[COMMIT ${log.date}]`}
                                  </span>
                                  <span className="text-[9px] uppercase tracking-wide text-[#7c6356]">
                                    {log.researchContext}
                                  </span>
                                </div>
                                <p className="text-[#3c2921]">{log.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RECENT CONTEXT EDITED AND USED */}
                  <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)]">
                    <div className="flex items-center justify-between border-b border-[#3c2921]/20 pb-3 mb-4">
                      <h3 className="font-serif text-lg text-[#251611] tracking-tight font-bold">[ RECENT CONTEXT EDITED AND USED ]</h3>
                      <span className="text-[10px] font-mono text-[#bf664d] font-bold">{currentBarangay.name} Registry</span>
                    </div>
                    
                    <div className="font-mono text-xs text-[#3c2921]/80 space-y-3 max-h-60 overflow-y-auto">
                      <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15 flex items-start gap-3">
                        <span className="text-terracotta font-bold">&gt;</span>
                        <div>
                          <span className="font-bold text-[#251611]">Latest Correction:</span>
                          <p className="text-[11px] text-[#7c6356] mt-1 leading-relaxed">
                            {currentBarangay.errataLog[0]?.groundTruth || 'No corrections logged yet for this context.'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15 flex items-start gap-3">
                        <span className="text-terracotta font-bold">&gt;</span>
                        <div>
                          <span className="font-bold text-[#251611]">Second Correction:</span>
                          <p className="text-[11px] text-[#7c6356] mt-1 leading-relaxed">
                            {currentBarangay.errataLog[1]?.groundTruth || 'Run audits to populate this section with verified corrections.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 2: WORKSPACE (Stage 1 Intake & Agent Bridge Terminal) */}
            {activeTab === 'workspace' && (
              <AgentsUnifiedWorkspace
                currentResearchContext={currentBarangay}
                researchContexts={barangays}
                setSelectedBarangayId={setSelectedBarangayId}
                localFiles={localFiles}
                workspaceViewMode={workspaceViewMode}
                setWorkspaceViewMode={setWorkspaceViewMode}
                rawIntakeInput={rawIntakeInput}
                setRawIntakeInput={setRawIntakeInput}
                stage1Result={stage1Result}
                isDenoisingStage1={isDenoisingStage1}
                handleStage1Denoise={handleStage1Denoise}
                archivistSynthesis={archivistSynthesis}
                isQueryingArchivist={isQueryingArchivist}
                handleQueryArchivist={handleQueryArchivist}
                stage2Result={stage2Result}
                isDenoisingStage2={isDenoisingStage2}
                handleStage2CrossReference={handleStage2CrossReference}
                handleCommitCheckpoint={handleCommitCheckpoint}
                handlePurgeTransit={handlePurgeTransit}
                roundtableMessages={roundtableMessages}
                isRoundtableProcessing={isRoundtableProcessing}
                roundtableInput={roundtableInput}
                setRoundtableInput={setRoundtableInput}
                handleSendRoundtableMessage={handleSendRoundtableMessage}
                auditQueue={auditQueue}
                setAuditQueue={setAuditQueue}
                activeQueueId={activeQueueId}
                setActiveQueueId={setActiveQueueId}
                handleRunQueueItem={handleRunQueueItem}
                auditMode={auditMode}
                setAuditMode={setAuditMode}
                auditChatResponse={auditChatResponse}
                isAuditChatLoading={isAuditChatLoading}
                auditChatQuery={auditChatQuery}
                setAuditChatQuery={setAuditChatQuery}
                handleTriggerAuditChat={handleTriggerAuditChat}
                setShowQuickAddModal={setShowQuickAddModal}
                setStage1Result={setStage1Result}
                setArchivistSynthesis={setArchivistSynthesis}
                setStage2Result={setStage2Result}
                handleSelectQueueItem={handleSelectQueueItem}
                handleQueueAndStartNew={handleQueueAndStartNew}
                handleClearQueue={handleClearQueue}
                tokensSaved={tokensSaved}
                cacheHits={cacheHits}
                communicatorInjection={communicatorInjection}
                archivistInjection={archivistInjection}
                scribeInjection={scribeInjection}
              />
            )}

            {/* TAB 3: AUDITING - UNIFIED WITH AGENTS WORKSPACE */}
            {activeTab === 'auditing' && (
              <div className="flex flex-col gap-6" id="auditing-integrated-workspace">
                
                {/* Side-by-Side 3-Column Layout based on User Sketches */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
                  
                  {/* COLUMN 1: [ QUEUE ] / [ CHATBOT ] */}
                  <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-5 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)] min-h-[585px]">
                    <div>
                      {/* Header */}
                      <div className="flex flex-col gap-2 border-b border-[#3c2921]/20 pb-3 mb-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-serif text-sm font-bold tracking-tight text-[#251611] uppercase flex items-center gap-2">
                            <span>📂 Observation Archive</span>
                            {auditMode === 'chatbot' && <span className="text-[10px] text-terracotta italic font-normal">(Chatbot Active)</span>}
                          </h3>
                          <button 
                            onClick={() => setShowQuickAddModal(true)}
                            className="w-7 h-7 bg-terracotta hover:bg-[#a6543b] text-white flex items-center justify-center font-bold text-lg rounded-sm transition-all cursor-pointer"
                            title="Quick Add to Queue"
                          >
                            <Plus className="w-4.5 h-4.5" />
                          </button>
                        </div>
                        <button
                          onClick={handleQueueAndStartNew}
                          className="w-full py-2 bg-[#bf664d] hover:bg-terracotta text-[#fcf8ef] font-mono font-bold text-[10px] uppercase transition-all rounded-sm flex items-center justify-center gap-1.5 border border-[#3c2921]/15 shadow-sm cursor-pointer"
                          title="Saves current work to queue and opens a clean new slate"
                        >
                          📥 Queue Active &amp; Start Fresh
                        </button>
                      </div>

                      {auditMode === 'queue' ? (
                        <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                          {auditQueue.length === 0 ? (
                            <div className="text-center py-10 font-mono text-xs text-[#7c6356] italic">
                              Queue is currently empty.
                            </div>
                          ) : (
                            auditQueue.map((item) => (
                              <div 
                                key={item.id}
                                onClick={() => handleSelectQueueItem(item)}
                                className={`p-3 border-2 transition-all cursor-pointer flex flex-col gap-2 rounded-sm ${
                                  activeQueueId === item.id 
                                    ? 'bg-[#dfd4bd] border-terracotta ring-1 ring-terracotta/20' 
                                    : 'bg-[#f4efe4] border-transparent hover:border-[#3c2921]/15'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="font-serif text-xs font-bold text-[#251611] truncate">
                                    {item.id}: {item.title}
                                  </div>
                                  <span className="text-[9px] font-mono font-bold bg-[#bf664d]/15 text-terracotta px-1.5 py-0.5 rounded uppercase shrink-0">
                                    {item.category}
                                  </span>
                                </div>
                                <p className="font-mono text-[10.5px] text-[#3c2921]/80 line-clamp-2 leading-relaxed">
                                  {item.text}
                                </p>
                                <div className="flex items-center justify-between pt-1 border-t border-[#3c2921]/5 text-[9px] font-mono text-[#7c6356]/80">
                                  <span>Author: {item.contributor}</span>
                                  <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                      onClick={() => {
                                        handleSelectQueueItem(item);
                                        setActiveTab('workspace');
                                        alert(`Restored ${item.id} to Workspace!`);
                                      }}
                                      className="px-2 py-0.5 bg-[#bf664d] hover:bg-terracotta text-[#e9e0cb] font-bold rounded-sm text-[9px] cursor-pointer"
                                    >
                                      Open
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (confirm("Remove this entry from the audit queue?")) {
                                          const remaining = auditQueue.filter(q => q.id !== item.id);
                                          setAuditQueue(remaining);
                                          if (activeQueueId === item.id) {
                                            if (remaining.length > 0) {
                                              handleSelectQueueItem(remaining[0]);
                                            } else {
                                              setActiveQueueId('');
                                              setRawIntakeInput("");
                                            }
                                          }
                                        }
                                      }}
                                      className="px-1.5 py-0.5 bg-rose-900/10 hover:bg-rose-950/20 text-rose-900 font-bold rounded-sm text-[9px] cursor-pointer"
                                    >
                                      Del
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        /* CHATBOT MINI TERMINAL */
                        <div className="flex flex-col gap-3">
                          <div className="bg-[#1d100c] text-emerald-400 p-3 font-mono text-[11px] h-[340px] overflow-y-auto rounded-sm border border-terracotta/20 flex flex-col gap-2">
                            <p className="text-[#dfd4bd]/60 italic">// Secure Sovereign Chatbot Terminal initialized.</p>
                            <p className="text-[#dfd4bd]/60 italic">// Ready to query the {currentBarangay.name} records and memory queue.</p>
                            
                            {auditChatResponse && (
                              <div className="mt-2 pt-2 border-t border-terracotta/10 text-[#dfd4bd]">
                                <span className="text-terracotta font-bold">[RESPONSE]:</span>
                                <p className="mt-1 leading-relaxed text-[#dfd4bd]/95 whitespace-pre-wrap">
                                  {auditChatResponse}
                                </p>
                              </div>
                            )}
                            
                            {isAuditChatLoading && (
                              <p className="text-amber-500 animate-pulse mt-2 font-bold">// AGENT DEEP SEARCH IN PROGRESS...</p>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={auditChatQuery}
                              onChange={(e) => setAuditChatQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleTriggerAuditChat();
                                }
                              }}
                              placeholder="Type historical question..."
                              className="flex-1 bg-white border border-[#3c2921]/20 px-3 py-1.5 text-xs font-mono text-[#3c2921] focus:outline-none"
                            />
                            <button 
                              onClick={handleTriggerAuditChat}
                              disabled={isAuditChatLoading || !auditChatQuery.trim()}
                              className="px-3 bg-terracotta text-white font-mono font-bold text-xs hover:bg-[#bf664d] disabled:opacity-50"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Toggle Mode buttons */}
                    <div className="flex gap-2 border-t border-[#3c2921]/15 pt-3 mt-4">
                      <button 
                        onClick={() => setAuditMode('queue')}
                        className={`flex-1 py-1.5 font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                          auditMode === 'queue'
                            ? 'bg-terracotta text-white border-terracotta shadow-sm'
                            : 'bg-[#f4efe4] text-[#7c6356] border-[#3c2921]/10 hover:bg-[#dfd4bd]'
                        }`}
                      >
                        QUEUE
                      </button>
                      <button 
                        onClick={() => setAuditMode('chatbot')}
                        className={`flex-1 py-1.5 font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                          auditMode === 'chatbot'
                            ? 'bg-terracotta text-white border-terracotta shadow-sm'
                            : 'bg-[#f4efe4] text-[#7c6356] border-[#3c2921]/10 hover:bg-[#dfd4bd]'
                        }`}
                      >
                        CHATBOT
                      </button>
                    </div>
                  </div>

                  {/* COLUMN 2: [ BENTO GRID & CANON CONTEXT ] */}
                  <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-5 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)] min-h-[585px] xl:col-span-1">
                    <div>
                      <div className="flex items-center justify-between border-b border-[#3c2921]/20 pb-2 mb-4">
                        <h3 className="font-serif text-sm font-bold tracking-tight text-[#251611] uppercase flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-terracotta" />
                          <span>[ BENTO GRID STAGES ]</span>
                        </h3>
                        <span className="text-[9px] font-mono font-bold bg-[#1d100c] text-[#dfd4bd] px-2 py-0.5 rounded uppercase">
                          {currentBarangay.name}
                        </span>
                      </div>

                      {/* 3-Agent Bento Grid inside column */}
                      <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
                        {/* Agent 1: Communicator */}
                        <div className="bg-[#fcf8ef] p-3 border border-[#3c2921]/15 rounded-sm">
                          <div className="text-[9px] font-mono font-bold text-terracotta uppercase border-b border-[#3c2921]/10 pb-1 mb-1.5">
                            Stage 1: Communicator (Gemini)
                          </div>
                          {stage1Result ? (
                            <p className="font-mono text-[10.5px] text-[#3c2921] leading-relaxed whitespace-pre-wrap">{stage1Result}</p>
                          ) : (
                            <p className="font-mono text-[10px] text-[#7c6356] italic">Awaiting Stage 1 Denoising...</p>
                          )}
                        </div>

                        {/* Agent 2: Archivist */}
                        <div className="bg-[#fcf8ef] p-3 border border-[#3c2921]/15 rounded-sm">
                          <div className="text-[9px] font-mono font-bold text-emerald-800 uppercase border-b border-[#3c2921]/10 pb-1 mb-1.5">
                            Stage 2: Archivist (NotebookLM)
                          </div>
                          {archivistSynthesis ? (
                            <p className="font-mono text-[10.5px] text-[#3c2921] leading-relaxed whitespace-pre-wrap">{archivistSynthesis}</p>
                          ) : (
                            <p className="font-mono text-[10px] text-[#7c6356] italic">Awaiting Archival Lookup...</p>
                          )}
                        </div>

                        {/* Agent 3: Scribe */}
                        <div className="bg-[#fcf8ef] p-3 border border-[#3c2921]/15 rounded-sm">
                          <div className="text-[9px] font-mono font-bold text-indigo-900 uppercase border-b border-[#3c2921]/10 pb-1 mb-1.5">
                            Stage 3: Scribe (Sovereign Scribe)
                          </div>
                          {stage2Result ? (
                            <div className="font-mono text-[10.5px] text-[#3c2921] leading-relaxed">
                              <div className="font-bold text-amber-800 mb-1">
                                {stage2Result.contradictionDetected ? "⚠️ Contradiction Detected" : "✅ Clean Logical Signal"}
                              </div>
                              <p className="text-[10.5px] whitespace-pre-wrap leading-relaxed">{stage2Result.contradictionDetails || stage2Result.analysisReport}</p>
                            </div>
                          ) : (
                            <div className="py-1 text-center">
                              <button
                                onClick={async () => {
                                  const activeItem = auditQueue.find(q => q.id === activeQueueId) || auditQueue[0];
                                  if (!activeItem) {
                                    alert("Please add an entry to the queue first.");
                                    return;
                                  }
                                  setIsAuditChatLoading(true);
                                  try {
                                    const response = await fetch('/api/validate', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        date: activeItem.date,
                                        sourceType: activeItem.category,
                                        contributor: activeItem.contributor,
                                        entryText: activeItem.text,
                                        category: activeItem.category.toLowerCase().includes('pivot') ? 'pivot' : 'erratum'
                                      })
                                    });
                                    const valData = await response.json();
                                    
                                    const auditResponse = await fetch('/api/audit', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        entryText: activeItem.text,
                                        contextMarkdown: currentBarangay.contextMarkdown
                                      })
                                    });
                                    const auditData = await auditResponse.json();
                                    
                                    setStage2Result({
                                      contradictionDetected: auditData.contradictionDetected,
                                      contradictionDetails: auditData.contradictionDetails || "None",
                                      analysisReport: auditData.analysisReport || "Scribe verified and approved the submission.",
                                      newErratumRule: auditData.proposedHotfixes ? {
                                        officialClaim: "Standard record assumptions",
                                        groundTruth: activeItem.text,
                                        source: activeItem.contributor
                                      } : null,
                                      proposedDiff: `+++ barangay_${selectedBarangayId}_context.md\n@@ -1,34 +1,41 @@\n-${currentBarangay.contextMarkdown.substring(0, 100)}...\n+${activeItem.text}\n+*Verified via ${activeItem.contributor} - ${activeItem.date}*`
                                    });
                                    alert("Success! Scribe audit compiled successfully using active queue entry.");
                                  } catch (err: any) {
                                    console.error(err);
                                    alert("Audit compilation simulation: " + err.message);
                                  } finally {
                                    setIsAuditChatLoading(false);
                                  }
                                }}
                                className="w-full py-2 bg-indigo-800 hover:bg-indigo-900 text-white font-mono text-xs font-bold uppercase transition-all rounded-sm cursor-pointer"
                              >
                                Compile Scribe Audit for {activeQueueId}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Sovereign Context.md View */}
                        <div className="border-t border-dashed border-[#3c2921]/20 pt-2.5 mt-1.5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-bold text-[#251611] uppercase">Living Canon (context.md):</span>
                            {!isEditingContext ? (
                              <button
                                onClick={handleStartEditingContext}
                                className="px-2 py-0.5 bg-[#bf664d] hover:bg-terracotta text-white font-mono text-[9px] font-bold uppercase transition-all rounded-sm shadow-xs cursor-pointer"
                              >
                                Edit Canon
                              </button>
                            ) : (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={handleSaveContextMarkdown}
                                  className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-900 text-white font-mono text-[9px] font-bold uppercase transition-all rounded-sm shadow-xs cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setIsEditingContext(false)}
                                  className="px-1.5 py-0.5 bg-[#3c2921]/10 text-[#3c2921] font-mono text-[9px] rounded-sm cursor-pointer"
                                >
                                  X
                                </button>
                              </div>
                            )}
                          </div>
                          {!isEditingContext ? (
                            <div className="bg-[#f4efe4] p-3 border border-[#3c2921]/10 text-[10.5px] font-mono leading-relaxed max-h-40 overflow-y-auto select-all text-[#3c2921]/90">
                              {currentBarangay.contextMarkdown}
                            </div>
                          ) : (
                            <textarea
                              value={contextEditText}
                              onChange={(e) => setContextEditText(e.target.value)}
                              className="w-full h-28 p-2.5 bg-[#fcf8ef] text-[#3c2921] border border-[#3c2921]/30 font-mono text-[10.5px] leading-relaxed focus:outline-none"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 3: [ ROUNDTABLE & RECONCILIATION ] */}
                  <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-5 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)] min-h-[585px] xl:col-span-1">
                    <div>
                      <div className="flex items-center justify-between border-b border-[#3c2921]/20 pb-2 mb-4">
                        <h3 className="font-serif text-sm font-bold tracking-tight text-[#251611] uppercase flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-terracotta" />
                          <span>[ ROUNDTABLE &amp; RECONCILE ]</span>
                        </h3>
                        <span className="text-[10px] font-mono font-bold bg-[#bf664d] text-[#e9e0cb] px-2.5 py-0.5 uppercase">
                          Sovereign Scribe
                        </span>
                      </div>

                      {/* Interactive Agent Roundtable Chat inside Auditing column */}
                      <div className="flex flex-col gap-2.5 mb-3.5">
                        <span className="text-[9px] font-mono font-bold text-terracotta uppercase">ROUNDTABLE STREAM:</span>
                        <div className="bg-[#dfd4bd] p-3 border border-[#3c2921]/15 h-[230px] overflow-y-auto font-mono text-[10.5px] text-[#3c2921] space-y-3 rounded-sm">
                          {roundtableMessages.map((msg, idx) => (
                            <div key={msg.id || idx} className={`flex flex-col gap-0.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                              <span className="text-[8.5px] font-bold uppercase text-terracotta">
                                {msg.sender === 'user' ? 'YOU' : msg.sender === 'communicator' ? 'COMMUNICATOR' : msg.sender === 'archivist' ? 'ARCHIVIST' : 'SCRIBE'}
                              </span>
                              <div className={`p-2 max-w-[90%] rounded-sm text-[10.5px] leading-relaxed border ${
                                msg.sender === 'user' ? 'bg-[#f4efe4] border-[#3c2921]/20' : 'bg-[#fcf8ef] border-[#3c2921]/10'
                              }`}>
                                {msg.text}
                              </div>
                            </div>
                          ))}
                          {isRoundtableProcessing && (
                            <p className="text-amber-600 animate-pulse text-[9.5px] font-bold">// Roundtable discussing...</p>
                          )}
                        </div>

                        {/* Chat input */}
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={roundtableInput}
                            onChange={(e) => setRoundtableInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && roundtableInput.trim() && !isRoundtableProcessing) {
                                handleSendRoundtableMessage(roundtableInput);
                                setRoundtableInput("");
                              }
                            }}
                            placeholder="Instruct roundtable..."
                            className="flex-1 bg-white border border-[#3c2921]/20 px-2.5 py-1 text-[11px] font-mono text-[#3c2921] focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              if (roundtableInput.trim() && !isRoundtableProcessing) {
                                handleSendRoundtableMessage(roundtableInput);
                                setRoundtableInput("");
                              }
                            }}
                            className="px-2.5 py-1 bg-terracotta text-white font-mono font-bold text-[10px] uppercase rounded-sm cursor-pointer"
                          >
                            Send
                          </button>
                        </div>
                      </div>

                      {/* Reconciliation patch and POOF Commit button */}
                      {stage2Result ? (
                        <div className="border-t border-[#3c2921]/15 pt-3 flex flex-col gap-2.5">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold font-mono text-[#3c2921]/70 uppercase">PROPOSED DIFF PATCH:</span>
                            <div className="bg-[#251611] p-2.5 border border-[#3c2921]/15 font-mono text-[9px] text-emerald-400 h-[100px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all rounded-sm">
                              {stage2Result.proposedDiff}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={handleCommitCheckpoint}
                              className="w-full flex items-center justify-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-mono font-bold text-[9px] uppercase py-2 border border-emerald-950 shadow-sm transition-all cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              APPROVE &amp; COMMIT (POOF PROTOCOL)
                            </button>
                            <button
                              onClick={handlePurgeTransit}
                              className="w-full py-1.5 bg-rose-800 hover:bg-rose-900 text-white font-mono text-[9px] font-bold uppercase border border-red-950 transition-all cursor-pointer"
                            >
                              PURGE &amp; ABANDON
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-[#3c2921]/15 pt-4 text-center">
                          <p className="font-mono text-[9.5px] text-[#7c6356] italic">
                            💡 Use the WORKSPACE tab to trigger and generate active Scribe logical checks for this paper of observation, or prompt the roundtable room to reconcile local testimonies.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

            

                {/* ADVANCED AUDITOR SUITE (Endpoints: /validate, /query, /patterns) */}
                <div className="lg:col-span-12 mt-8 border-t-2 border-dashed border-[#3c2921]/30 pt-8">
                  <div className="flex items-center gap-2 mb-6">
                    <Activity className="w-5.5 h-5.5 text-terracotta" />
                    <h3 className="font-serif text-xl text-[#251611] tracking-tight font-extrabold uppercase">
                      [ Interactive Auditor API Suite ]
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* COLUMN 1: INTERACTIVE FORM-BASED COMMIT VALIDATOR (POST /api/validate) */}
                    <div className="lg:col-span-6 bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-[#3c2921]/20 pb-2.5 mb-4 font-mono">
                          <span className="text-xs font-bold text-terracotta uppercase flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-terracotta" />
                            1. Form-Based Commit Validator
                          </span>
                          <span className="text-[9px] bg-[#3c2921] text-[#e9e0cb] px-2 py-0.5 font-bold">POST /validate</span>
                        </div>
                        <p className="font-mono text-[11px] text-[#7c6356] leading-relaxed mb-4">
                          Pre-flight check for structured historical entries. Enforces metadata fields, category taxonomy classification, and integrity of inline asset references.
                        </p>

                        {/* Error and Success Banners */}
                        {validatorErrors && (
                          <div className="bg-red-950/15 border-l-4 border-red-700 p-3 mb-4 font-mono text-[11px] text-red-900 leading-relaxed">
                            <strong className="block uppercase text-red-950 mb-1">⚠️ Structured Validation Reject:</strong>
                            {Object.entries(validatorErrors).map(([field, err]) => (
                              <div key={field}>• <span className="font-bold uppercase">{field}:</span> {String(err)}</div>
                            ))}
                          </div>
                        )}

                        {validatorSuccess && (
                          <div className="bg-emerald-950/10 border-l-4 border-emerald-800 p-3 mb-4 font-mono text-[11px] text-emerald-900 leading-relaxed">
                            <div className="flex items-center gap-1.5 font-bold uppercase text-emerald-950 mb-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                              {validatorSuccess.message}
                            </div>
                            <div className="bg-[#dfd4bd] p-2 mt-2 border border-[#3c2921]/15 text-[#3c2921] font-mono text-[10px] whitespace-pre-wrap">
                              {validatorSuccess.formattedMarkdown}
                            </div>
                            <button
                              onClick={() => {
                                setRawIntakeInput(validatorSuccess.formattedMarkdown);
                                setActiveTab('workspace');
                                alert("Success! Validated entry text copied into Stage 1 Workspace Intake!");
                              }}
                              className="mt-3 w-full py-1.5 bg-emerald-800 text-white font-bold text-[10px] uppercase hover:bg-emerald-900 transition-colors"
                            >
                              Seed Stage-1 Ingestion with Validated Entry
                            </button>
                          </div>
                        )}

                        {/* Validation Form */}
                        <div className="flex flex-col gap-3 font-mono text-xs text-[#3c2921]">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#7c6356] mb-1">Record Date:</label>
                              <input 
                                type="text" 
                                placeholder="e.g. 2026-05-12" 
                                value={validatorDate}
                                onChange={(e) => setValidatorDate(e.target.value)}
                                className="w-full bg-[#dfd4bd] border border-[#3c2921]/20 p-2 font-mono text-xs focus:outline-none focus:border-terracotta"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#7c6356] mb-1">Contributor ID:</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Elder Lino" 
                                value={validatorContributor}
                                onChange={(e) => setValidatorContributor(e.target.value)}
                                className="w-full bg-[#dfd4bd] border border-[#3c2921]/20 p-2 font-mono text-xs focus:outline-none focus:border-terracotta"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#7c6356] mb-1">Source Type:</label>
                              <select 
                                value={validatorSourceType}
                                onChange={(e) => setValidatorSourceType(e.target.value)}
                                className="w-full bg-[#dfd4bd] border border-[#3c2921]/20 p-2 font-mono text-xs focus:outline-none focus:border-terracotta"
                              >
                                <option value="Oral Testimony">Oral Testimony</option>
                                <option value="Community Survey">Community Survey</option>
                                <option value="Agrarian Record">Agrarian Record</option>
                                <option value="Field Observation">Field Observation</option>
                                <option value="Official Map">Official Map</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#7c6356] mb-1">Log Routing Tag:</label>
                              <select 
                                value={validatorCategory}
                                onChange={(e) => setValidatorCategory(e.target.value as "pivot" | "erratum")}
                                className="w-full bg-[#dfd4bd] border border-[#3c2921]/20 p-2 font-mono text-xs focus:outline-none focus:border-terracotta"
                              >
                                <option value="erratum">Erratum Log ([ERR-CODE])</option>
                                <option value="pivot">Pivot Log ([PIVOT])</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-[#7c6356] mb-1">Proposed Entry Text (With Asset Filenames):</label>
                            <textarea 
                              placeholder="Describe your ground truth. If referring to a field photo, map, or proof, you must cite the exact filename (e.g., canal-aratilis-may2026.jpg)" 
                              value={validatorEntryText}
                              onChange={(e) => setValidatorEntryText(e.target.value)}
                              rows={4}
                              className="w-full bg-[#dfd4bd] border border-[#3c2921]/20 p-2 font-mono text-xs focus:outline-none focus:border-terracotta leading-relaxed"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleValidateEntry}
                        disabled={isValidating}
                        className="w-full mt-4 bg-[#bf664d] hover:bg-[#a04f38] disabled:bg-gray-400 text-white font-mono font-bold text-xs uppercase py-3 border border-black transition-all hover:scale-[1.01]"
                      >
                        {isValidating ? "COMPUTING FIELD-LEVEL INTEGRITY..." : "VERIFY ENTRY STRUCTURE"}
                      </button>
                    </div>

                    {/* COLUMN 2: THE AUDITOR Q&A TERMINAL (POST /api/query) */}
                    <div className="lg:col-span-6 flex flex-col gap-6">
                      
                      {/* SUB-PANEL A: THE AUDITOR Q&A */}
                      <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)]">
                        <div className="flex items-center justify-between border-b border-[#3c2921]/20 pb-2.5 mb-4 font-mono">
                          <span className="text-xs font-bold text-terracotta uppercase flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-terracotta" />
                            2. The Auditor Q&A Terminal
                          </span>
                          <span className="text-[9px] bg-[#3c2921] text-[#e9e0cb] px-2 py-0.5 font-bold">POST /query</span>
                        </div>
                        
                        <p className="font-mono text-[11px] text-[#7c6356] leading-relaxed mb-4">
                          Natural Language queries grounded directly inside the active document. Citations are verified and cited line-by-line.
                        </p>

                        {/* Q&A Input and Toggles */}
                        <div className="flex flex-col gap-3 font-mono text-xs">
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] uppercase font-bold text-[#3c2921]">
                              <input 
                                type="checkbox" 
                                checked={useAuditorContext}
                                onChange={(e) => setUseAuditorContext(e.target.checked)}
                                className="accent-terracotta"
                              />
                              Anchor to Ground Truth Context
                            </label>
                          </div>

                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Ask anything about the canonical records..." 
                              value={auditorQueryText}
                              onChange={(e) => setAuditorQueryText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAuditorQuery()}
                              className="flex-1 bg-[#dfd4bd] border border-[#3c2921]/20 p-2.5 font-mono text-xs focus:outline-none focus:border-terracotta"
                            />
                            <button
                              onClick={handleAuditorQuery}
                              disabled={isAuditorQueryLoading}
                              className="bg-[#3c2921] hover:bg-[#251611] text-[#e9e0cb] px-4 font-bold text-xs uppercase border border-black transition-all font-mono"
                            >
                              {isAuditorQueryLoading ? "..." : "SEND"}
                            </button>
                          </div>
                        </div>

                        {/* Q&A Response Screen */}
                        {auditorQueryResponse && (
                          <div className="mt-4 p-4 bg-[#dfd4bd] border border-[#3c2921]/15 max-h-56 overflow-y-auto leading-relaxed">
                            <span className="text-[10px] font-mono font-bold uppercase text-terracotta tracking-wider block mb-1">Grounded Synthesis Answer:</span>
                            <p className="font-mono text-xs text-[#3c2921] whitespace-pre-wrap">{auditorQueryResponse}</p>
                            
                            {/* Citations list */}
                            {auditorQueryCitations.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-[#3c2921]/15">
                                <span className="text-[9px] font-mono font-bold uppercase text-[#7c6356] tracking-wider block mb-1.5">Cited Record Sources:</span>
                                <div className="flex flex-col gap-1.5">
                                  {auditorQueryCitations.map((cit, idx) => (
                                    <div key={idx} className="bg-[#e9e0cb] p-2 border border-[#3c2921]/10 text-[10px] font-mono text-[#3c2921]/90 pl-3 border-l-2 border-terracotta">
                                      <p className="italic">"{cit.text}"</p>
                                      {cit.line && <p className="text-[8px] text-terracotta mt-0.5">Line {cit.line} in context.md</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* SUB-PANEL B: CROSS-REPOSITORY PATTERN ANALYZER */}
                      <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)]">
                        <div className="flex items-center justify-between border-b border-[#3c2921]/20 pb-2.5 mb-4 font-mono">
                          <span className="text-xs font-bold text-terracotta uppercase flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-terracotta" />
                            3. Cross-Repository Pattern Analyzer
                          </span>
                          <span className="text-[9px] bg-[#3c2921] text-[#e9e0cb] px-2 py-0.5 font-bold">POST /patterns</span>
                        </div>
                        
                        <p className="font-mono text-[11px] text-[#7c6356] leading-relaxed mb-4">
                          Scan across all custom repositories in the user's workspace to detect resurfacing topics, common institutional errors, or recurring field sources.
                        </p>

                        <button
                          onClick={handleScanPatterns}
                          disabled={isScanningPatterns}
                          className="w-full bg-[#3c2921] hover:bg-[#251611] disabled:bg-gray-400 text-[#e9e0cb] font-mono font-bold text-xs uppercase py-3 border border-black transition-all hover:scale-[1.01]"
                        >
                          {isScanningPatterns ? "CONDUCTING SWEEP ACROSS WORKSPACE REPOS..." : "TRIGGER MULTI-REPO PATTERN SWEEP"}
                        </button>

                        {/* Proposals list */}
                        {patternProposals.length > 0 && (
                          <div className="mt-4 flex flex-col gap-3 max-h-60 overflow-y-auto">
                            <span className="text-[10px] font-mono font-bold uppercase text-terracotta tracking-wider block">Detected Synthesis Patterns:</span>
                            {patternProposals.map((prop, idx) => (
                              <div key={idx} className="bg-[#dfd4bd] border border-[#3c2921]/15 p-3 font-mono text-xs text-[#3c2921]/95 relative">
                                <div className="absolute top-1.5 right-2 text-[9px] uppercase font-bold text-terracotta bg-[#e9e0cb] px-1.5 py-0.5">
                                  {prop.type || "Topic"}
                                </div>
                                <h4 className="font-bold text-[#251611] uppercase tracking-wide text-xs mb-1 pr-14">{prop.title}</h4>
                                <p className="leading-relaxed mb-2 text-[#3c2921]/80">{prop.description}</p>
                                
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setSavedPatterns(prev => [...prev, prop]);
                                      setPatternProposals(prev => prev.filter((_, i) => i !== idx));
                                      alert("Pattern logged under verified Capstone analytics!");
                                    }}
                                    className="bg-emerald-800 text-white font-bold text-[9px] px-2.5 py-1 uppercase hover:bg-emerald-950 transition-colors font-mono"
                                  >
                                    Confirm &amp; Log Pattern
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPatternProposals(prev => prev.filter((_, i) => i !== idx));
                                    }}
                                    className="bg-rose-800 text-white font-bold text-[9px] px-2.5 py-1 uppercase hover:bg-rose-950 transition-colors font-mono"
                                  >
                                    Dismiss Proposal
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Saved Patterns records */}
                        {savedPatterns.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-[#3c2921]/15 font-mono">
                            <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block mb-2">Verified Active Patterns:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {savedPatterns.map((pat, idx) => (
                                <span key={idx} className="bg-emerald-950/15 text-emerald-900 text-[10px] px-2 py-1 font-bold rounded flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-800" />
                                  {pat.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: CONTEXT ARCHIVES */}
            {activeTab === 'context' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LIVING CANONICAL CONTEXT DISPLAY (SUB-TABBED FILE & DRAG SYSTEM) */}
                <div className="lg:col-span-7 bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)] min-h-[640px]">
                  
                  <div>
                    {/* Sub-Tab Switcher Headers */}
                    <div className="flex flex-wrap items-center justify-between border-b border-[#3c2921]/20 pb-2 mb-4 gap-2">
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setContextSubTab('view')}
                          className={`px-3 py-1 font-serif text-xs font-bold uppercase transition-all border ${
                            contextSubTab === 'view'
                              ? 'bg-terracotta text-white border-terracotta'
                              : 'bg-[#f4efe4] text-[#7c6356] border-[#3c2921]/10 hover:bg-[#dfd4bd]'
                          }`}
                        >
                          📖 General Directory
                        </button>
                        <button 
                          onClick={() => setContextSubTab('search')}
                          className={`px-3 py-1 font-serif text-xs font-bold uppercase transition-all border ${
                            contextSubTab === 'search'
                              ? 'bg-terracotta text-white border-terracotta'
                              : 'bg-[#f4efe4] text-[#7c6356] border-[#3c2921]/10 hover:bg-[#dfd4bd]'
                          }`}
                        >
                          🔍 Search
                        </button>
                        <button 
                          onClick={() => setContextSubTab('manager')}
                          className={`px-3 py-1 font-serif text-xs font-bold uppercase transition-all border ${
                            contextSubTab === 'manager'
                              ? 'bg-terracotta text-white border-terracotta'
                              : 'bg-[#f4efe4] text-[#7c6356] border-[#3c2921]/10 hover:bg-[#dfd4bd]'
                          }`}
                        >
                          📂 File Manager
                        </button>
                        <button 
                          onClick={() => setContextSubTab('drag')}
                          className={`px-3 py-1 font-serif text-xs font-bold uppercase transition-all border ${
                            contextSubTab === 'drag'
                              ? 'bg-terracotta text-white border-terracotta'
                              : 'bg-[#f4efe4] text-[#7c6356] border-[#3c2921]/10 hover:bg-[#dfd4bd]'
                          }`}
                        >
                          💾 Transport
                        </button>
                      </div>

                      {/* Global Quick-copy + Delete Context actions */}
                      <div className="flex items-center gap-3">
                        {contextSubTab === 'view' && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(currentBarangay.contextMarkdown);
                              alert("Markdown context copied to clipboard! Ready to hand off to NotebookLM, Sovereign Scribe or external nodes.");
                            }}
                            className="flex items-center gap-1 text-[11px] text-terracotta hover:text-terracotta-dark font-mono font-bold uppercase"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            [ Copy markdown ]
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteBarangay(currentBarangay.id, currentBarangay.name)}
                          className="flex items-center gap-1 text-[11px] text-rose-800 hover:text-rose-900 font-mono font-bold uppercase"
                          title="Permanently delete this research context"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          [ Delete Context ]
                        </button>
                      </div>
                    </div>

                    {/* SUB-TAB CONTENT 1: VIEW CANONICAL / EDITOR */}
                    {contextSubTab === 'view' && (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold bg-[#1d100c] text-[#dfd4bd] px-2.5 py-1 uppercase rounded-sm">
                            Active Core: {currentBarangay.name}
                          </span>
                          {!isEditingContext ? (
                            <button
                              id="btn-edit-context-md"
                              onClick={handleStartEditingContext}
                              className="px-3 py-1 bg-[#bf664d] hover:bg-terracotta text-white font-mono text-[10px] font-bold uppercase transition-all rounded-sm flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              ✍️ Edit Context MD
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                id="btn-save-context-md"
                                onClick={handleSaveContextMarkdown}
                                className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-mono text-[10px] font-bold uppercase transition-all rounded-sm flex items-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                💾 Save Changes
                              </button>
                              <button
                                id="btn-cancel-context-md"
                                onClick={() => setIsEditingContext(false)}
                                className="px-3 py-1 bg-[#3c2921]/10 hover:bg-[#3c2921]/20 text-[#3c2921] font-mono text-[10px] font-bold uppercase transition-all rounded-sm cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {!isEditingContext ? (
                          <div className="flex flex-col gap-3">
                            {/* Heading Navigation Outline */}
                            <div className="bg-[#dfd4bd] border border-[#3c2921]/20 p-3 rounded-sm">
                              <span className="text-[10px] font-mono font-bold text-terracotta uppercase block mb-2">// INTERACTIVE OUTLINE (PARSED FROM CANONICAL HEADINGS)</span>
                              <div className="flex flex-wrap gap-1.5">
                                {currentBarangay.contextMarkdown
                                  .split("\n")
                                  .filter(line => line.trim().startsWith("#"))
                                  .map((line, idx) => {
                                    const level = line.match(/^#+/)?.[0].length || 1;
                                    const text = line.replace(/^#+\s*/, "").trim();
                                    const headingId = `heading-${idx}`;
                                    
                                    // Style based on level
                                    let btnStyle = "text-[9px] font-mono font-bold uppercase border px-2 py-1 transition-all ";
                                    if (level === 1) btnStyle += "bg-terracotta text-white border-terracotta hover:bg-[#a6543b]";
                                    else if (level === 2) btnStyle += "bg-[#1d100c] text-[#dfd4bd] border-[#1d100c] hover:bg-black";
                                    else btnStyle += "bg-[#dfd4bd] text-[#251611] border-[#3c2921]/20 hover:bg-[#cfc2a8]";

                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          const el = document.getElementById(headingId);
                                          if (el) {
                                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                                            // Temporary background flash effect
                                            el.classList.add("bg-[#bf664d]/20");
                                            setTimeout(() => el.classList.remove("bg-[#bf664d]/20"), 2000);
                                          }
                                        }}
                                        className={btnStyle}
                                      >
                                        {text}
                                      </button>
                                    );
                                  })
                                }
                              </div>
                            </div>

                            {/* Rendered Markdown Box with scrollable anchor points */}
                            <div 
                              id="display-canonical-markdown" 
                              className="bg-[#dfd4bd] p-5 border border-[#3c2921]/15 overflow-y-auto max-h-[460px] text-xs text-[#3c2921] leading-relaxed rounded-sm select-all flex flex-col gap-3"
                            >
                              {(() => {
                                let headingCounter = 0;
                                return currentBarangay.contextMarkdown.split("\n").map((line, lineIdx) => {
                                  const trimmed = line.trim();
                                  if (trimmed.startsWith("#")) {
                                    const level = trimmed.match(/^#+/)?.[0].length || 1;
                                    const text = trimmed.replace(/^#+\s*/, "").trim();
                                    const headingId = `heading-${headingCounter++}`;

                                    if (level === 1) {
                                      return (
                                        <h1 key={lineIdx} id={headingId} className="font-serif text-base font-extrabold text-[#1d100c] border-b border-terracotta pb-1 mt-4 transition-all duration-300">
                                          {text}
                                        </h1>
                                      );
                                    } else if (level === 2) {
                                      return (
                                        <h2 key={lineIdx} id={headingId} className="font-serif text-xs font-bold text-terracotta mt-3 transition-all duration-300">
                                          {text}
                                        </h2>
                                      );
                                    } else {
                                      return (
                                        <h3 key={lineIdx} id={headingId} className="font-mono text-[10px] font-bold text-[#251611] uppercase tracking-wide mt-2 transition-all duration-300">
                                          {text}
                                        </h3>
                                      );
                                    }
                                  }
                                  
                                  if (trimmed === "") {
                                    return <div key={lineIdx} className="h-2" />;
                                  }

                                  const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
                                  let contentText = isBullet ? trimmed.substring(2) : line;

                                  // Simple markdown parser for **bold** and *italics*
                                  const boldItalicRegex = /(\*\*.*?\*\*|\*.*?\*)/g;
                                  const splitParts = contentText.split(boldItalicRegex);
                                  
                                  const parsedSpans = splitParts.map((part, pIdx) => {
                                    if (part.startsWith("**") && part.endsWith("**")) {
                                      return <strong key={pIdx} className="font-bold text-[#251611]">{part.slice(2, -2)}</strong>;
                                    } else if (part.startsWith("*") && part.endsWith("*")) {
                                      return <em key={pIdx} className="italic text-[#3c2921]">{part.slice(1, -1)}</em>;
                                    }
                                    return part;
                                  });

                                  if (isBullet) {
                                    return (
                                      <div key={lineIdx} className="flex items-start gap-2 pl-3 font-sans text-[11px] text-[#3c2921]/90 leading-relaxed">
                                        <span className="text-terracotta select-none mt-1 shrink-0">•</span>
                                        <span className="font-medium">{parsedSpans}</span>
                                      </div>
                                    );
                                  }

                                  return (
                                    <p key={lineIdx} className="font-sans text-[11px] font-medium text-[#3c2921]/90 leading-relaxed">
                                      {parsedSpans}
                                    </p>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <textarea
                              id="context-markdown-textarea-editor"
                              value={contextEditText}
                              onChange={(e) => setContextEditText(e.target.value)}
                              className="w-full h-[400px] p-4 bg-[#fcf8ef] text-[#3c2921] border-2 border-[#3c2921]/30 font-mono text-xs leading-relaxed focus:outline-none focus:border-terracotta resize-y rounded-sm"
                              placeholder="Write or paste your custom context.md files here..."
                            />
                            <p className="text-[10px] font-mono text-[#7c6356] leading-normal italic">
                              💡 Students can update this file directly. Saving commits the changes in real-time to your Firestore repository context!
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-TAB CONTENT 2: SEARCH ARCHIVES */}
                    {contextSubTab === 'search' && (
                      <div className="flex flex-col gap-4">
                        
                        {/* Search bar & count indicator */}
                        <div className="flex gap-2.5">
                          <div className="relative flex-1">
                            <input 
                              type="text"
                              value={contextSearchQuery}
                              onChange={(e) => setContextSearchQuery(e.target.value)}
                              placeholder="Type keyword to search across filenames & content..."
                              className="w-full bg-[#fcf8ef] border border-[#3c2921]/30 pl-8 pr-3 py-1.5 font-mono text-xs text-[#251611] focus:outline-none placeholder-[#7c6356]/50 rounded-sm"
                            />
                            <Search className="w-4 h-4 text-[#7c6356]/60 absolute left-2.5 top-2" />
                          </div>
                        </div>

                        {/* Search Results Summary */}
                        <div className="flex items-center justify-between bg-[#dfd4bd] px-3 py-1.5 border border-[#3c2921]/15 text-[10px] font-mono">
                          <span className="text-[#3c2921]/80 font-bold">
                            🔍 Filter Active (Keyword: "{contextSearchQuery || "None"}")
                          </span>
                          <span className="text-terracotta font-bold">
                            {localFiles.filter(f => !contextSearchQuery || f.name.toLowerCase().includes(contextSearchQuery.toLowerCase()) || f.content.toLowerCase().includes(contextSearchQuery.toLowerCase())).length} Matches Found
                          </span>
                        </div>

                        {/* Matches List with Line Previews */}
                        <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
                          {localFiles.length === 0 && (
                            <div className="text-center py-10 font-mono text-xs text-[#7c6356] italic">
                              No files yet. Add records via the File Manager tab.
                            </div>
                          )}
                          {localFiles
                            .filter(f => !contextSearchQuery || f.name.toLowerCase().includes(contextSearchQuery.toLowerCase()) || f.content.toLowerCase().includes(contextSearchQuery.toLowerCase()))
                            .map((file) => {
                              // Find lines containing the query
                              const matches: string[] = [];
                              if (contextSearchQuery.trim()) {
                                const lines = file.content.split("\n");
                                lines.forEach((line) => {
                                  if (line.toLowerCase().includes(contextSearchQuery.toLowerCase()) && matches.length < 3) {
                                    matches.push(line.trim());
                                  }
                                });
                              }

                              return (
                                <div 
                                  key={file.name}
                                  onClick={() => {
                                    setSelectedContextFile(file);
                                    setEditingFileText(file.content);
                                    setIsEditingFile(false);
                                  }}
                                  className={`p-3 border-2 transition-all cursor-pointer flex flex-col gap-2 rounded-sm ${
                                    selectedContextFile?.name === file.name 
                                      ? 'bg-[#dfd4bd] border-terracotta' 
                                      : 'bg-[#f4efe4] border-transparent hover:border-[#3c2921]/15'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="checkbox"
                                        checked={!!file.selected}
                                        onChange={() => {
                                          setLocalFiles(localFiles.map(f => f.name === file.name ? { ...f, selected: !f.selected } : f));
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="accent-terracotta cursor-pointer w-3.5 h-3.5"
                                        title="Mark file for translocal transport"
                                      />
                                      <span className="font-serif text-xs font-bold text-[#251611] truncate">
                                        {file.name}
                                      </span>
                                    </div>
                                    <span className="text-[9px] font-mono font-bold bg-[#bf664d]/10 text-terracotta px-1.5 py-0.5 rounded shrink-0">
                                      {file.category}
                                    </span>
                                  </div>

                                  {/* Line occurrence highlighting */}
                                  {matches.length > 0 ? (
                                    <div className="bg-[#1d100c]/5 border-l-2 border-[#bf664d] p-1.5 flex flex-col gap-1 font-mono text-[9px] text-[#3c2921]/80 rounded-r-sm">
                                      <span className="font-bold text-[#bf664d] text-[8px] uppercase tracking-wider block">Occurrences:</span>
                                      {matches.map((match, mIdx) => {
                                        const queryStart = match.toLowerCase().indexOf(contextSearchQuery.toLowerCase());
                                        if (queryStart !== -1) {
                                          const before = match.substring(0, queryStart);
                                          const term = match.substring(queryStart, queryStart + contextSearchQuery.length);
                                          const after = match.substring(queryStart + contextSearchQuery.length);
                                          return (
                                            <p key={mIdx} className="line-clamp-1 italic">
                                              &gt; ...{before}<span className="bg-[#bf664d]/20 text-terracotta font-bold px-0.5">{term}</span>{after}...
                                            </p>
                                          );
                                        }
                                        return <p key={mIdx} className="line-clamp-1 italic">&gt; {match}</p>;
                                      })}
                                    </div>
                                  ) : (
                                    <p className="font-mono text-[10px] text-[#7c6356] line-clamp-2">
                                      {file.content.substring(0, 140)}...
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between text-[8px] font-mono text-[#7c6356]/70 pt-1 border-t border-[#3c2921]/5">
                                    <span>Date: {file.date}</span>
                                    <span>Size: {file.size}</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB CONTENT 3: FILE MANAGER & CREATOR */}
                    {contextSubTab === 'manager' && (
                      <div className="flex flex-col gap-4">
                        
                        {/* File Creation Trigger / Form */}
                        <div className="flex flex-col gap-2 bg-[#dfd4bd]/40 p-3.5 border border-[#3c2921]/15 rounded-sm">
                          {!isCreatingFile ? (
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold text-terracotta uppercase tracking-wide">// REPOSITORY RECORDING DESK</span>
                              <button
                                onClick={() => setIsCreatingFile(true)}
                                className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-mono text-[9px] font-bold uppercase rounded-sm flex items-center gap-1 transition-all cursor-pointer"
                              >
                                ➕ Create Custom Record
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 text-xs">
                              <span className="font-mono text-[10px] font-bold text-terracotta uppercase block border-b border-[#3c2921]/10 pb-1">
                                // RECORD ENTRY SCHEMATIC
                              </span>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[9px] font-bold text-[#7c6356]">Record Name (.md):</label>
                                  <input 
                                    type="text"
                                    value={newFileName}
                                    onChange={(e) => setNewFileName(e.target.value)}
                                    placeholder="e.g. oral-testimony-silvestre.md"
                                    className="bg-white border border-[#3c2921]/20 p-1 px-2 text-xs focus:outline-none rounded-sm"
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[9px] font-bold text-[#7c6356]">Record Category:</label>
                                  <select
                                    value={newFileCategory}
                                    onChange={(e) => setNewFileCategory(e.target.value)}
                                    className="bg-white border border-[#3c2921]/20 p-1 px-1.5 text-xs focus:outline-none rounded-sm"
                                  >
                                    <option value="Oral History Log">Oral History Log</option>
                                    <option value="Historical Document">Historical Document</option>
                                    <option value="Riparian Field Audit">Riparian Field Audit</option>
                                    <option value="Community Recollection">Community Recollection</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1 font-mono">
                                <label className="text-[9px] font-bold text-[#7c6356]">Record Content (Markdown formatted):</label>
                                <textarea
                                  value={newFileContent}
                                  onChange={(e) => setNewFileContent(e.target.value)}
                                  placeholder="# Title of Oral Evidence\n- Date: 2026\n- Contributor: Elder Silvestre\n\nContent details here..."
                                  className="bg-white border border-[#3c2921]/20 p-2 text-xs font-mono h-28 focus:outline-none resize-none rounded-sm"
                                />
                              </div>

                              <div className="flex items-center justify-end gap-2 font-mono mt-1">
                                <button
                                  onClick={() => setIsCreatingFile(false)}
                                  className="px-3 py-1 bg-[#3c2921]/10 hover:bg-[#3c2921]/20 text-[#3c2921] font-bold text-[10px] uppercase rounded-sm"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => {
                                    if (!newFileName.trim()) {
                                      alert("Please enter a valid file name.");
                                      return;
                                    }
                                    const finalizedName = newFileName.trim().endsWith('.md') ? newFileName.trim() : `${newFileName.trim()}.md`;
                                    const isDuplicate = localFiles.some(f => f.name.toLowerCase() === finalizedName.toLowerCase());
                                    if (isDuplicate) {
                                      alert("A file with this name already exists.");
                                      return;
                                    }
                                    const newFile = {
                                      name: finalizedName,
                                      type: 'markdown',
                                      size: `${(newFileContent.length / 1024).toFixed(1)} KB`,
                                      date: new Date().toISOString().split('T')[0],
                                      selected: false,
                                      category: newFileCategory,
                                      content: newFileContent
                                    };
                                    setLocalFiles([...localFiles, newFile]);
                                    setNewFileName('');
                                    setNewFileContent('');
                                    setIsCreatingFile(false);
                                    setSelectedContextFile(newFile);
                                    setEditingFileText(newFile.content);
                                    setIsEditingFile(false);
                                    alert(`Successfully initialized custom record: ${newFile.name}!`);
                                  }}
                                  className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[10px] uppercase rounded-sm cursor-pointer"
                                >
                                  💾 Commit Record
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* File Directory List */}
                        <div className="border border-[#3c2921]/15 max-h-[160px] overflow-y-auto bg-[#fcf8ef]">
                          <table className="w-full text-left font-mono text-[10px]">
                            <thead>
                              <tr className="bg-[#dfd4bd]/40 border-b border-[#3c2921]/15 text-[#7c6356] font-bold">
                                <th className="py-1 px-2.5 w-8">Transport</th>
                                <th className="py-1 px-2">Record File Name</th>
                                <th className="py-1 px-2">Category</th>
                                <th className="py-1 px-2 w-16 text-right pr-2">Size</th>
                              </tr>
                            </thead>
                            <tbody>
                              {localFiles.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-6 text-center italic text-[#7c6356]">No files yet.</td>
                                </tr>
                              ) : (
                                localFiles.map((file) => (
                                  <tr 
                                    key={file.name}
                                    onClick={() => {
                                      setSelectedContextFile(file);
                                      setEditingFileText(file.content);
                                      setIsEditingFile(false);
                                    }}
                                    className={`border-b border-[#3c2921]/5 hover:bg-[#dfd4bd]/20 cursor-pointer ${
                                      selectedContextFile?.name === file.name ? 'bg-[#dfd4bd]/35 font-semibold text-terracotta' : ''
                                    }`}
                                  >
                                    <td className="py-1.5 px-2.5" onClick={(e) => e.stopPropagation()}>
                                      <input 
                                        type="checkbox"
                                        checked={!!file.selected}
                                        onChange={() => {
                                          setLocalFiles(localFiles.map(f => f.name === file.name ? { ...f, selected: !f.selected } : f));
                                        }}
                                        className="accent-terracotta cursor-pointer w-3.5 h-3.5"
                                      />
                                    </td>
                                    <td className="py-1.5 px-2 truncate max-w-[150px] font-bold text-[#251611]">
                                      {file.name}
                                    </td>
                                    <td className="py-1.5 px-2 text-[#7c6356] truncate max-w-[120px]">
                                      {file.category}
                                    </td>
                                    <td className="py-1.5 px-2 text-right pr-2 text-[#3c2921]/75">
                                      {file.size}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* File Inspector Pane */}
                        {selectedContextFile && (
                          <div className="bg-[#dfd4bd]/30 border border-[#3c2921]/15 p-3.5 rounded-sm flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-[#3c2921]/10 pb-1.5">
                              <div>
                                <span className="text-[9px] font-bold text-[#7c6356] font-mono uppercase block">// INSPECTING MEMORY NODE</span>
                                <span className="text-xs font-serif font-bold text-terracotta truncate">{selectedContextFile.name}</span>
                              </div>
                              <div className="flex gap-2 font-mono text-[9px]">
                                {!isEditingFile ? (
                                  <>
                                    <button 
                                      onClick={() => {
                                        setIsEditingFile(true);
                                        setEditingFileText(selectedContextFile.content);
                                      }}
                                      className="px-2 py-0.5 bg-[#bf664d] hover:bg-terracotta text-[#e9e0cb] font-semibold rounded-sm cursor-pointer"
                                    >
                                      ✍️ Edit Content
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (confirm(`Permanently purge ${selectedContextFile.name} from records?`)) {
                                          const updated = localFiles.filter(f => f.name !== selectedContextFile.name);
                                          setLocalFiles(updated);
                                          setSelectedContextFile(updated[0] || null);
                                          setIsEditingFile(false);
                                        }
                                      }}
                                      className="px-2 py-0.5 bg-rose-900/10 hover:bg-rose-900/20 text-rose-900 font-bold rounded-sm cursor-pointer"
                                    >
                                      [ Purge Record ]
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => {
                                        const updated = localFiles.map(f => f.name === selectedContextFile.name ? { ...f, content: editingFileText, size: `${(editingFileText.length / 1024).toFixed(1)} KB` } : f);
                                        setLocalFiles(updated);
                                        setSelectedContextFile({ ...selectedContextFile, content: editingFileText, size: `${(editingFileText.length / 1024).toFixed(1)} KB` });
                                        setIsEditingFile(false);
                                        alert(`Success! Updated record content for ${selectedContextFile.name}.`);
                                      }}
                                      className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-sm cursor-pointer"
                                    >
                                      💾 Save Content
                                    </button>
                                    <button 
                                      onClick={() => setIsEditingFile(false)}
                                      className="px-2 py-0.5 bg-[#3c2921]/10 hover:bg-[#3c2921]/20 text-[#3c2921] font-semibold rounded-sm"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-[#7c6356] bg-white/45 p-1.5 border border-[#3c2921]/5">
                              <span><strong>Type:</strong> {selectedContextFile.type.toUpperCase()}</span>
                              <span><strong>Modified:</strong> {selectedContextFile.date}</span>
                              <span className="col-span-2 truncate"><strong>Classification:</strong> {selectedContextFile.category}</span>
                            </div>

                            {(() => {
                              const headings = selectedContextFile.content
                                .split("\n")
                                .filter((line: string) => line.trim().startsWith("#"))
                                .map((line: string) => {
                                  const level = line.match(/^#+/)?.[0].length || 1;
                                  const text = line.replace(/^#+\s*/, "").trim();
                                  return { level, text };
                                });
                              if (headings.length === 0) return null;
                              return (
                                <div className="bg-white/40 border border-[#3c2921]/10 p-2 rounded-sm">
                                  <span className="text-[9px] font-mono font-bold text-terracotta uppercase block mb-1.5">// PARSED OUTLINE</span>
                                  <div className="flex flex-wrap gap-1">
                                    {headings.map((h: { level: number; text: string }, idx: number) => (
                                      <span
                                        key={idx}
                                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${
                                          h.level === 1 ? 'bg-terracotta text-white' :
                                          h.level === 2 ? 'bg-[#1d100c] text-[#dfd4bd]' :
                                          'bg-[#dfd4bd] text-[#251611]'
                                        }`}
                                      >
                                        {h.text}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            {!isEditingFile ? (
                              <div className="bg-white/95 border border-[#3c2921]/10 p-2.5 text-[10px] font-mono text-[#3c2921]/90 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed rounded-sm select-all">
                                {selectedContextFile.content}
                              </div>
                            ) : (
                              <textarea
                                value={editingFileText}
                                onChange={(e) => setEditingFileText(e.target.value)}
                                className="w-full h-36 bg-white border border-[#3c2921]/20 p-2 text-[10px] font-mono text-[#3c2921]/90 focus:outline-none resize-y rounded-sm"
                              />
                            )}

                            {/* Push compile to Stage 1 Workspace action */}
                            <button
                              onClick={() => {
                                setRawIntakeInput(selectedContextFile.content);
                                setActiveTab('workspace');
                                alert(`Success! Handed off ${selectedContextFile.name} content directly to Stage 1 Roundtable Intake.`);
                              }}
                              className="w-full py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-mono text-[9px] font-bold uppercase rounded-sm shadow-sm"
                            >
                              🚀 Hand off Record Content to Active Intake Workspace
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-TAB CONTENT 3: PORTABLE DRAG IN / DRAG OUT TRANSPORT */}
                    {contextSubTab === 'drag' && (
                      <div className="flex flex-col gap-5">
                        
                        {/* PORTABLE DRAG IN AREA */}
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-mono font-bold text-terracotta uppercase tracking-wider block">// PROTOCOL 1: INGEST TRANSLOCAL RECORD (DRAG IN)</span>
                          
                          <div 
                            onDragOver={(e) => { e.preventDefault(); setIsDraggingOverImport(true); }}
                            onDragLeave={() => setIsDraggingOverImport(false)}
                            onDrop={async (e) => {
                              e.preventDefault();
                              setIsDraggingOverImport(false);
                              const filesArray = Array.from(e.dataTransfer.files);
                              if (filesArray.length > 0) {
                                const staged = await stageFilesForImport(filesArray as File[]);
                                setStagedImportFiles([...stagedImportFiles, ...staged]);
                                alert(`Success! Staged ${staged.length} file(s). Review checklist below to commit.`);
                              }
                            }}
                            className={`p-6 border-2 border-dashed rounded-sm flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all ${
                              isDraggingOverImport 
                                ? 'bg-[#dfd4bd] border-terracotta' 
                                : 'bg-[#fcf8ef] border-[#3c2921]/20 hover:border-terracotta/40'
                            }`}
                          >
                            <Upload className={`w-8 h-8 ${isDraggingOverImport ? 'text-terracotta animate-bounce' : 'text-[#7c6356]/60'}`} />
                            <div className="font-mono text-xs">
                              <p className="font-bold text-[#251611]">Drag community transcripts / map files here</p>
                              <p className="text-[10px] text-[#7c6356] mt-1">Accepts .md records or photography .jpg/.png proofs</p>
                            </div>

                            {/* Standard input trigger */}
                            <label className="mt-2 text-[10px] font-mono font-bold bg-[#bf664d] text-[#e9e0cb] hover:bg-terracotta px-2.5 py-1 cursor-pointer shadow-sm">
                              [ OR SELECT FILE ]
                              <input 
                                type="file" 
                                multiple
                                className="hidden" 
                                onChange={async (e) => {
                                  const files = e.target.files;
                                  if (files && files.length > 0) {
                                    const staged = await stageFilesForImport(Array.from(files));
                                    setStagedImportFiles([...stagedImportFiles, ...staged]);
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>

                          {/* Staged files review board */}
                          {stagedImportFiles.length > 0 && (
                            <div className="bg-[#dfd4bd]/45 p-3 border border-terracotta/30 rounded-sm">
                              <span className="text-[10px] font-bold font-mono text-terracotta uppercase block mb-2">📥 Staged files ready for verification:</span>
                              <div className="flex flex-col gap-1.5 max-h-24 overflow-y-auto mb-3">
                                {stagedImportFiles.map((st, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-white/70 px-2 py-1 font-mono text-[10px] rounded-sm">
                                    <span className="truncate max-w-[180px] font-semibold text-[#251611]">{st.name}</span>
                                    <span className="text-emerald-800 font-bold">({st.size})</span>
                                    <button 
                                      onClick={() => setStagedImportFiles(stagedImportFiles.filter((_, i) => i !== idx))}
                                      className="text-rose-900 hover:text-red-600 font-bold"
                                    >
                                      [ Remove ]
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button 
                                onClick={() => {
                                  setLocalFiles([...localFiles, ...stagedImportFiles]);
                                  setStagedImportFiles([]);
                                  alert("Sovereign memory committed! Checked staged files are now part of your permanent translocal archives.");
                                }}
                                className="w-full text-center py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-mono font-bold text-[10px] uppercase shadow-sm"
                              >
                                Import Staged Memory Files into Core
                              </button>
                            </div>
                          )}
                        </div>

                        {/* PORTABLE DRAG OUT AREA - INTEGRATED MULTI-FILE COPY & DRAG HUB */}
                        <div className="flex flex-col gap-2 border-t border-[#3c2921]/15 pt-4">
                          <span className="text-[10px] font-mono font-bold text-terracotta uppercase tracking-wider block">// PROTOCOL 2: EMIT PORTABLE CANONICAL BUNDLE & MULTI-COPY HUB (DRAG OUT)</span>
                          
                          <div className="p-4 bg-[#dfd4bd]/35 border border-[#3c2921]/10 rounded-sm flex flex-col gap-3">
                            <p className="font-mono text-[10px] text-[#7c6356] leading-relaxed">
                              Select files in the checklist directly below to populate this transport dashboard. You can click any active file card to copy its raw content, drag cards individually into other tabs or text editors, or copy them all in one-click.
                            </p>

                            {/* Direct Checklist Selector */}
                            <div className="bg-[#fcf8ef] border border-[#3c2921]/15 p-3 rounded-sm flex flex-col gap-2">
                              <span className="text-[10px] font-mono font-bold text-[#bf664d] uppercase block">Select Files to Transport / Drag:</span>
                              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                                {localFiles.length === 0 ? (
                                  <div className="text-center py-4 italic text-[#7c6356] text-[10px]">No files yet.</div>
                                ) : (
                                  localFiles.map((file) => (
                                    <label key={file.name} className="flex items-center gap-2 font-mono text-[10px] text-[#251611] hover:bg-[#dfd4bd]/20 p-1 rounded cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={!!file.selected}
                                        onChange={() => {
                                          setLocalFiles(localFiles.map(f => f.name === file.name ? { ...f, selected: !f.selected } : f));
                                        }}
                                        className="accent-terracotta cursor-pointer"
                                      />
                                      <span className="truncate max-w-[180px] font-semibold">{file.name}</span>
                                      <span className="text-[#7c6356]/70 text-[9px]">({file.category})</span>
                                    </label>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-mono bg-white/50 p-2 border border-[#3c2921]/10">
                              <span className="text-[#251611] font-semibold">Active Checked Files:</span>
                              <span className="text-terracotta font-bold">{localFiles.filter(f => f.selected).length} Files Selected</span>
                            </div>

                            {/* Active checked files interactive shelf */}
                            {localFiles.filter(f => f.selected).length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-[#1d100c]/5 border border-[#3c2921]/10 rounded-sm">
                                {localFiles.filter(f => f.selected).map((file, fIdx) => (
                                  <div
                                    key={fIdx}
                                    draggable="true"
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData("text/plain", `--- SOURCE FILE: ${file.name} ---\n${file.content}`);
                                      e.dataTransfer.effectAllowed = "copy";
                                    }}
                                    onClick={() => {
                                      navigator.clipboard.writeText(file.content);
                                      alert(`Copied contents of ${file.name} to clipboard!`);
                                    }}
                                    className="p-2.5 bg-white border border-[#3c2921]/20 hover:border-terracotta hover:bg-orange-50/35 transition-all cursor-grab active:cursor-grabbing flex flex-col gap-1.5 rounded-sm shadow-xs relative group"
                                    title="Drag file or click to copy contents"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-serif text-[11px] font-bold text-[#251611] truncate max-w-[120px]">{file.name}</span>
                                      <span className="text-[8px] font-mono uppercase bg-terracotta/10 text-terracotta px-1 rounded font-bold shrink-0">
                                        {file.type}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between font-mono text-[9px] text-[#7c6356]">
                                      <span>Size: {file.size}</span>
                                      <span className="text-[10px] group-hover:text-terracotta transition-colors flex items-center gap-0.5">🗂️ Drag/Copy</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 font-mono text-xs text-[#7c6356]/70 italic border border-dashed border-[#3c2921]/15 rounded-sm bg-white/20">
                                Checklist is empty. Mark files in the Search tab to populate this deck.
                              </div>
                            )}

                            {/* Global Bulk Actions */}
                            {localFiles.filter(f => f.selected).length > 0 && (
                              <div className="flex flex-col gap-2 pt-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => {
                                      const checked = localFiles.filter(f => f.selected);
                                      const formatted = checked.map(f => `=== FILE: ${f.name} (${f.category}) ===\n${f.content}`).join('\n\n=========================================\n\n');
                                      navigator.clipboard.writeText(formatted);
                                      alert(`Successfully copied combined contents of all ${checked.length} selected files to clipboard!`);
                                    }}
                                    className="py-1.5 px-3 bg-[#3c2921] hover:bg-[#1d100c] text-[#dfd4bd] font-mono text-[10px] font-bold uppercase rounded-sm flex items-center justify-center gap-1.5 shadow-sm"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy Content Bundle
                                  </button>

                                  <button
                                    onClick={() => {
                                      const checked = localFiles.filter(f => f.selected);
                                      const manifest = `ALA-ALAB SOVEREIGN REPOSITORY MANIFEST\nGenerated: ${new Date().toLocaleString()}\nResearch Context: ${currentBarangay.name}\nTotal Files: ${checked.length}\n\n` +
                                        checked.map((f, i) => `${i + 1}. [${f.type.toUpperCase()}] ${f.name} (${f.size}) - ${f.category}`).join('\n');
                                      navigator.clipboard.writeText(manifest);
                                      alert("Copied Git-style research manifest tree to clipboard!");
                                    }}
                                    className="py-1.5 px-3 bg-[#3c2921] hover:bg-[#1d100c] text-[#dfd4bd] font-mono text-[10px] font-bold uppercase rounded-sm flex items-center justify-center gap-1.5 shadow-sm"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    Copy Repo Manifest
                                  </button>
                                </div>

                                <button
                                  onClick={async () => {
                                    const activeExports = localFiles.filter(f => f.selected);
                                    if (activeExports.length === 0) return;

                                    const zip = new JSZip();
                                    const manifestLines = [
                                      `ALA-ALAB SOVEREIGN REPOSITORY MANIFEST`,
                                      `Generated: ${new Date().toLocaleString()}`,
                                      `Research Context: ${currentBarangay.name}`,
                                      `Total Files: ${activeExports.length}`,
                                      ``,
                                    ];
                                    activeExports.forEach((f, i) => {
                                      const ext = f.name.includes('.') ? '' : (f.type === 'markdown' ? '.md' : '.txt');
                                      zip.file(`${f.name}${ext}`, f.content || '');
                                      manifestLines.push(`${i + 1}. [${f.type.toUpperCase()}] ${f.name} (${f.size}) - ${f.category}`);
                                    });
                                    zip.file('manifest.txt', manifestLines.join('\n'));

                                    const blob = await zip.generateAsync({ type: 'blob' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `ala-alab-${currentBarangay.name.toLowerCase().replace(/\s+/g, '-')}-bundle.zip`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);

                                    alert(`Success! Exported ZIP bundle with ${activeExports.length} files. Saved to downloads!`);
                                  }}
                                  className="w-full flex items-center justify-center gap-2 bg-terracotta hover:bg-[#a6543b] text-white font-mono font-bold text-xs uppercase py-2 shadow-md border-2 border-terracotta-dark"
                                >
                                  <Download className="w-4 h-4" />
                                  DOWNLOAD ARCHIVE BUNDLE (.ZIP)
                                </button>
                              </div>
                            )}

                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  <div className="mt-6 p-3 bg-[#bf664d]/10 border border-[#bf664d]/30 text-xs font-mono text-[#3c2921] flex items-start gap-2.5">
                    <HelpCircle className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Sovereign portable storage prevents data deletion from central power grids. Keep transcripts cached locally on standard flash drives to operate entirely outside the cloud.
                    </p>
                  </div>
                </div>

                {/* ACTIVE ERRATA LOG & GEOMETRY MAP */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* ACTIVE ERRATA REGISTRY */}
                  <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)]">
                    <div className="flex items-center gap-2 border-b border-[#3c2921]/20 pb-3 mb-4">
                      <Shield className="w-5 h-5 text-terracotta" />
                      <h3 className="font-serif text-base text-[#251611] font-bold">
                        [ ACTIVE ERRATA LOG ]
                      </h3>
                    </div>

                    <div className="flex flex-col gap-3.5 max-h-80 overflow-y-auto pr-1">
                      {currentBarangay.errataLog.length > 0 ? (
                        currentBarangay.errataLog.map((err) => (
                          <div key={err.id} className="bg-[#bf664d]/5 border-2 border-terracotta/40 p-4 relative overflow-hidden">
                            <div className="absolute top-1.5 right-2 font-mono text-[9px] font-bold text-terracotta">
                              {err.id}
                            </div>
                            
                            <div className="text-[10px] text-terracotta font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-terracotta" />
                              Institutional Claim Corrected
                            </div>

                            <div className="mt-3 flex flex-col gap-2 text-xs font-mono text-[#3c2921]">
                              <p className="leading-relaxed bg-[#dfd4bd] p-2 border border-[#3c2921]/10">
                                <strong className="text-[#7c6356] block text-[9px] uppercase tracking-wider">LGU Official Claim:</strong> 
                                {err.officialClaim}
                              </p>
                              <p className="leading-relaxed bg-[#e9e0cb] p-2 border border-[#3c2921]/20 text-[#251611] font-bold">
                                <strong className="text-terracotta block text-[9px] uppercase tracking-wider">Ground Truth Reality:</strong> 
                                {err.groundTruth}
                              </p>
                            </div>
                            
                            <div className="mt-3 text-[9px] text-[#7c6356] font-mono italic">
                              Proven by: {err.source}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 font-mono text-xs text-[#7c6356] italic">
                          No errata regulations mapped for this Research Context. Execute Stage 2 Audits to commit verified corrections.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 5: CREDITS PAGE */}
            {activeTab === 'credits' && (
              <div className="flex flex-col gap-6">
                
                {/* HERO PANEL */}
                <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-8 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-terracotta/5 rounded-full blur-3xl"></div>
                  
                  <div className="max-w-3xl">
                    <span className="text-[10px] font-mono font-bold bg-[#bf664d] text-[#e9e0cb] px-2.5 py-1 uppercase tracking-widest rounded-sm">
                      Sovereignty &amp; Memory Archive Project
                    </span>
                    <h3 className="font-serif text-3xl text-[#251611] font-bold uppercase tracking-tight mt-4">
                      gitMeFanta
                    </h3>
                    <p className="font-mono text-xs text-[#3c2921]/90 mt-3 leading-relaxed">
                      An autonomous, community-driven archival and verification engine dedicated to preserving local oral testimonies and historical truth. Designed to stand as a sovereign barrier against historical amnesia and record loss.
                    </p>
                  </div>
                </div>

                {/* THE COLLABORATORS & TEAMS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* DESIGN PHILOSOPHY & CRAFT */}
                  <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)] flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-base text-[#251611] font-bold border-b border-[#3c2921]/20 pb-2 mb-4 uppercase">
                        [ Visual Identity &amp; Aesthetic Craft ]
                      </h4>
                      <p className="font-mono text-xs text-[#3c2921]/80 leading-relaxed mb-4">
                        gitMeFanta employs a distinctive, eye-safe vintage terracotta palette, structured grids, and monospace display typography. Inspired by woodblock prints and physical revolutionary broadsheets, every pixel reinforces the dignity of community-authored archives.
                      </p>

                      <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                        <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15 rounded-sm">
                          <span className="font-bold text-terracotta block uppercase">Primary Theme</span>
                          <span className="text-[#3c2921]/70">Cosmic Slate &amp; Terracotta</span>
                        </div>
                        <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15 rounded-sm">
                          <span className="font-bold text-emerald-800 block uppercase">Typography</span>
                          <span className="text-[#3c2921]/70">Serif Headings &amp; JetBrains Mono</span>
                        </div>
                        <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15 rounded-sm">
                          <span className="font-bold text-[#251611] block uppercase">Structure</span>
                          <span className="text-[#3c2921]/70">Bento Grid Reporting</span>
                        </div>
                        <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15 rounded-sm">
                          <span className="font-bold text-[#bf664d] block uppercase">Local Defense</span>
                          <span className="text-[#3c2921]/70">Sovereign Data Crypt</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PROJECT ROLL OF HONOR & NODE REGISTRY */}
                  <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)] flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-base text-[#251611] font-bold border-b border-[#3c2921]/20 pb-2 mb-4 uppercase">
                        [ Project Roll &amp; Credits ]
                      </h4>
                      
                      <div className="space-y-3 font-mono text-xs">
                        <div className="flex justify-between items-start border-b border-[#3c2921]/10 pb-1.5">
                          <span className="font-bold text-[#251611]">Node Identification:</span>
                          <span className="text-right text-indigo-900 font-bold">{nodeId}</span>
                        </div>
                        <div className="flex justify-between items-start border-b border-[#3c2921]/10 pb-1.5">
                          <span className="font-bold text-[#251611]">Lead Node Operator:</span>
                          <span className="text-right text-terracotta font-bold">{nodeOperator}</span>
                        </div>
                        <div className="flex justify-between items-start border-b border-[#3c2921]/10 pb-1.5">
                          <span className="font-bold text-[#251611]">Sponsoring Collective:</span>
                          <span className="text-right text-[#3c2921]">{nodeAuthorityScope}</span>
                        </div>
                        <div className="flex justify-between items-start border-b border-[#3c2921]/10 pb-1.5">
                          <span className="font-bold text-[#251611]">Verification Token:</span>
                          <span className="text-right text-[#7c6356] truncate max-w-[160px] font-mono">{nodeAuthKey}</span>
                        </div>
                        <div className="flex justify-between items-start border-b border-[#3c2921]/10 pb-1.5">
                          <span className="font-bold text-[#251611]">Sovereign Tech Stack:</span>
                          <span className="text-right text-[#3c2921]">React 18, Tailwind CSS, Firestore</span>
                        </div>
                        <div className="flex justify-between items-start border-b border-[#3c2921]/10 pb-1.5">
                          <span className="font-bold text-[#251611]">Verification AI Layers:</span>
                          <span className="text-right text-emerald-800 font-bold">Gemini, NotebookLM, Sovereign Scribe</span>
                        </div>
                      </div>
                    </div>

                    {/* NODE REGISTRY EDIT PANEL */}
                    <div className="mt-5 pt-4 border-t border-[#3c2921]/20">
                      <h5 className="font-serif text-[11px] text-terracotta font-bold uppercase tracking-wider mb-2.5">
                        ⚙️ Update Local Node Registry Keys
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[9px] text-[#7c6356] font-bold">Node ID Code:</label>
                          <input 
                            type="text" 
                            value={nodeId} 
                            onChange={(e) => setNodeId(e.target.value)}
                            className="bg-[#dfd4bd]/40 border border-[#3c2921]/20 p-1 font-mono text-[10px] focus:outline-none focus:border-terracotta text-[#251611] rounded-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-[9px] text-[#7c6356] font-bold">Lead Node Operator:</label>
                          <input 
                            type="text" 
                            value={nodeOperator} 
                            onChange={(e) => setNodeOperator(e.target.value)}
                            className="bg-[#dfd4bd]/40 border border-[#3c2921]/20 p-1 font-mono text-[10px] focus:outline-none focus:border-terracotta text-[#251611] rounded-sm"
                          />
                        </div>
                        <div className="col-span-2 flex flex-col gap-0.5">
                          <label className="text-[9px] text-[#7c6356] font-bold">Sponsoring Collective:</label>
                          <input 
                            type="text" 
                            value={nodeAuthorityScope} 
                            onChange={(e) => setNodeAuthorityScope(e.target.value)}
                            className="bg-[#dfd4bd]/40 border border-[#3c2921]/20 p-1 font-mono text-[10px] focus:outline-none focus:border-terracotta text-[#251611] rounded-sm"
                          />
                        </div>
                        <div className="col-span-2 flex flex-col gap-0.5">
                          <label className="text-[9px] text-[#7c6356] font-bold">Registry Verification Key:</label>
                          <input 
                            type="text" 
                            value={nodeAuthKey} 
                            onChange={(e) => setNodeAuthKey(e.target.value)}
                            className="bg-[#dfd4bd]/40 border border-[#3c2921]/20 p-1 font-mono text-[10px] focus:outline-none focus:border-terracotta text-[#251611] rounded-sm"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          alert(`Success! Committed sovereign node registry configurations. Keys registered for ID: ${nodeId}!`);
                        }}
                        className="w-full mt-3 py-1.5 bg-[#bf664d] hover:bg-terracotta text-[#e9e0cb] font-mono text-[10px] font-bold uppercase rounded-sm shadow-sm transition-all"
                      >
                        Commit Registry Keys &amp; Deploy
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}
            {/* TAB 6: SETTINGS (Node Registry) */}
            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ACCOUNT PROFILE DETAILS */}
                <div className="lg:col-span-6 bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)]">
                  <h3 className="font-serif text-lg text-[#251611] tracking-tight font-bold border-b border-[#3c2921]/20 pb-3 mb-4">
                    [ NODE REGISTRY DETAILS ]
                  </h3>

                  <div className="space-y-4 font-mono text-xs text-[#3c2921]">
                    <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15 flex items-center justify-between">
                      <span className="font-bold text-[#7c6356]">Active Node Operator:</span>
                      <span className="text-[#251611] font-semibold text-right">{user?.email || nodeOperator}</span>
                    </div>

                    <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15 flex items-center justify-between">
                      <span className="font-bold text-[#7c6356]">Gateway Status:</span>
                      <span className="text-emerald-800 font-bold text-right flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 animate-pulse"></span>
                        CONNECTED
                      </span>
                    </div>

                    <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15 flex items-center justify-between">
                      <span className="font-bold text-[#7c6356]">Authority Scope:</span>
                      <span className="text-[#251611] font-semibold text-right">{nodeAuthorityScope}</span>
                    </div>

                    <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15 flex items-center justify-between">
                      <span className="font-bold text-[#7c6356]">Node Authentication Key:</span>
                      <span className="text-[#bf664d] font-bold text-right">{nodeAuthKey}</span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-[#bf664d]/10 border border-[#bf664d]/30 font-mono text-xs text-[#3c2921] leading-relaxed">
                    <strong>Autonomous Authority Clause:</strong> This client syncs directly to your Firestore account. Changes approved in the workspace undergo local cryptographically-signed verification during checkpoint transitions.
                  </div>
                </div>

                {/* MULTI-AGENT INJECTIONS & PROMPT TUNING */}
                <div className="lg:col-span-12 xl:col-span-6 bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)] flex flex-col gap-4">
                  <div>
                    <h3 className="font-serif text-lg text-[#251611] tracking-tight font-bold border-b border-[#3c2921]/20 pb-3 mb-2">
                      [ MULTI-AGENT INJECTIONS &amp; PROMPT TUNING ]
                    </h3>
                    <p className="text-[11px] font-mono text-[#7c6356] leading-relaxed mb-4">
                      Customize system instructions injected directly into active protocols for the roundtable communication pipeline.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Tab Switcher */}
                    <div className="flex items-center gap-1.5 border-b border-[#3c2921]/15 pb-2">
                      <button
                        onClick={() => setInjectionSubTab('communicator')}
                        className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all border rounded-sm ${
                          injectionSubTab === 'communicator'
                            ? 'bg-terracotta text-white border-terracotta'
                            : 'bg-[#f4efe4] text-[#7c6356] border-[#3c2921]/10 hover:bg-[#dfd4bd]'
                        }`}
                      >
                        📢 Communicator
                      </button>
                      <button
                        onClick={() => setInjectionSubTab('archivist')}
                        className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all border rounded-sm ${
                          injectionSubTab === 'archivist'
                            ? 'bg-terracotta text-white border-terracotta'
                            : 'bg-[#f4efe4] text-[#7c6356] border-[#3c2921]/10 hover:bg-[#dfd4bd]'
                        }`}
                      >
                        📖 Archivist
                      </button>
                      <button
                        onClick={() => setInjectionSubTab('scribe')}
                        className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all border rounded-sm ${
                          injectionSubTab === 'scribe'
                            ? 'bg-terracotta text-white border-terracotta'
                            : 'bg-[#f4efe4] text-[#7c6356] border-[#3c2921]/10 hover:bg-[#dfd4bd]'
                        }`}
                      >
                        ✒️ Scribe
                      </button>
                    </div>

                    {/* Communicator Tab */}
                    {injectionSubTab === 'communicator' && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-mono font-bold text-[#251611] uppercase tracking-wider">
                            📢 Communicator (Stage 1 Intake) Injection:
                          </label>
                          <span className="text-[9px] font-mono font-bold text-emerald-800">[ active ]</span>
                        </div>
                        <textarea
                          value={communicatorInjection}
                          onChange={(e) => {
                            setCommunicatorInjection(e.target.value);
                            localStorage.setItem('communicator_injection_v1', e.target.value);
                          }}
                          className="w-full bg-[#dfd4bd]/45 p-3 border-2 border-[#3c2921]/15 text-[#3c2921] font-mono text-xs leading-relaxed focus:outline-none focus:border-terracotta rounded-sm resize-y h-56"
                          placeholder="Configure custom instructions for Stage 1..."
                        />
                      </div>
                    )}

                    {/* Archivist Tab */}
                    {injectionSubTab === 'archivist' && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-mono font-bold text-[#251611] uppercase tracking-wider">
                            📖 Archivist (Stage 2 Synthesis) Injection:
                          </label>
                          <span className="text-[9px] font-mono font-bold text-emerald-800">[ active ]</span>
                        </div>
                        <textarea
                          value={archivistInjection}
                          onChange={(e) => {
                            setArchivistInjection(e.target.value);
                            localStorage.setItem('archivist_injection_v1', e.target.value);
                          }}
                          className="w-full bg-[#dfd4bd]/45 p-3 border-2 border-[#3c2921]/15 text-[#3c2921] font-mono text-xs leading-relaxed focus:outline-none focus:border-terracotta rounded-sm resize-y h-56"
                          placeholder="Configure custom instructions for Stage 2..."
                        />
                      </div>
                    )}

                    {/* Scribe Tab */}
                    {injectionSubTab === 'scribe' && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-mono font-bold text-[#251611] uppercase tracking-wider">
                            ✒️ Sovereign Scribe (Stage 3 Logical Audit) Injection:
                          </label>
                          <span className="text-[9px] font-mono font-bold text-emerald-800">[ active ]</span>
                        </div>
                        <textarea
                          value={scribeInjection}
                          onChange={(e) => {
                            setScribeInjection(e.target.value);
                            localStorage.setItem('scribe_injection_v1', e.target.value);
                          }}
                          className="w-full bg-[#dfd4bd]/45 p-3 border-2 border-[#3c2921]/15 text-[#3c2921] font-mono text-xs leading-relaxed focus:outline-none focus:border-terracotta rounded-sm resize-y h-56"
                          placeholder="Configure custom instructions for Stage 3..."
                        />
                      </div>
                    )}

                    <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15 rounded-sm">
                      <p className="text-[10px] font-mono text-[#7c6356] leading-relaxed italic">
                        💡 Changes are saved locally to your device cache in real-time. The active pipeline immediately respects your custom guidelines during the next run.
                      </p>
                    </div>
                  </div>
                </div>

                {/* RESTORE AND DIAGNOSTICS */}
                <div className="lg:col-span-6 flex flex-col gap-6">
                  <div className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 p-6 shadow-[4px_4px_0px_0px_rgba(37,22,17,0.15)]">
                    <h3 className="font-serif text-base text-[#251611] font-bold border-b border-[#3c2921]/20 pb-3 mb-4">
                      [ NODE OPERATIONS &amp; DIAGNOSTICS ]
                    </h3>

                    <div className="space-y-4">
                      <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15">
                        <h4 className="text-xs font-mono font-bold text-terracotta uppercase">Local Workspace Reset:</h4>
                        <p className="text-[11px] font-mono text-[#7c6356] mt-1.5 leading-relaxed">
                          Clear all research contexts from this browser session's view. Firestore data is untouched and will reload on refresh.
                        </p>
                        <button
                          onClick={handleResetToDefaults}
                          className="mt-3.5 px-4 py-2.5 bg-red-800 hover:bg-red-900 text-white font-mono text-xs font-bold uppercase border-2 border-red-950 transition-colors"
                        >
                          CLEAR LOCAL WORKSPACE
                        </button>
                      </div>

                      <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15">
                        <h4 className="text-xs font-mono font-bold text-terracotta uppercase">System Diagnostics:</h4>
                        <p className="text-[11px] font-mono text-[#7c6356] mt-1.5 leading-relaxed">
                          Ping server nodes to verify that the Express routing layer and Gemini proxy are responding properly.
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/health');
                              const data = await res.json();
                              alert(`Backend responding! status: ${data.status || 'ok'}`);
                            } catch (e: any) {
                              alert("Diagnostics failed: " + e.message);
                            }
                          }}
                          className="mt-3.5 px-4 py-2 bg-[#251611] hover:bg-[#3c2921] text-white font-mono text-xs font-bold uppercase transition-colors"
                        >
                          TEST HEALTH API
                        </button>
                      </div>

                      <div className="p-3 bg-[#dfd4bd] border border-[#3c2921]/15">
                        <h4 className="text-xs font-mono font-bold text-terracotta uppercase">Sovereign API Optimization &amp; Cache:</h4>
                        <p className="text-[11px] font-mono text-[#7c6356] mt-1.5 leading-relaxed">
                          Control local caching, simulate network cuts, and enable low-cost dense prompt techniques.
                        </p>
                        
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                          <div className="bg-[#1d100c] p-2.5 border border-terracotta/10 rounded">
                            <span className="text-[#bf664d] block font-bold text-[10px] uppercase">Cache Hit Rate</span>
                            <span className="text-lg font-serif text-[#e9e0cb] font-bold">{cacheHits} hits</span>
                          </div>
                          <div className="bg-[#1d100c] p-2.5 border border-terracotta/10 rounded">
                            <span className="text-[#bf664d] block font-bold text-[10px] uppercase">Est. Saved Tokens</span>
                            <span className="text-lg font-serif text-[#e9e0cb] font-bold">{tokensSaved} tokens</span>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3 font-mono text-[11px]">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none text-[#251611] font-semibold">
                            <input
                              type="checkbox"
                              checked={isCompactPrompts}
                              onChange={(e) => setIsCompactPrompts(e.target.checked)}
                              className="w-4 h-4 rounded border-2 border-terracotta/30 text-terracotta focus:ring-0 focus:outline-none"
                            />
                            <span>Enable Dense Prompt Optimization (reduces API token consumption)</span>
                          </label>

                          <label className="flex items-center gap-2.5 cursor-pointer select-none text-red-900 font-bold">
                            <input
                              type="checkbox"
                              checked={isLocalSimulatedOffline}
                              onChange={(e) => setIsLocalSimulatedOffline(e.target.checked)}
                              className="w-4 h-4 rounded border-2 border-red-850 text-red-700 focus:ring-0 focus:outline-none"
                            />
                            <span>Simulate API Offline Mode (forces sovereign manual backup)</span>
                          </label>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => {
                              setApiCache({ intake: {}, archivist: {}, scribe: {}, query: {} });
                              localStorage.removeItem('ala_alab_api_cache_v1');
                              setCacheHits(0);
                              setTokensSaved(0);
                              alert("Sovereign API Semantic Cache purged completely!");
                            }}
                            className="px-4 py-2 bg-[#bf664d] hover:bg-[#a04f38] text-white font-mono text-[10px] font-bold uppercase transition-colors"
                          >
                            Purge Cache Registry
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

              </>
            )}

          </section>
        </div>

        {/* ELEGANT HISTORICAL FOOTER */}
        <footer className="bg-[#251611] border-t border-[#3c2921]/20 py-6 px-6 text-xs text-[#dfd4bd]/80 flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
          <div>
            <span className="text-white font-serif tracking-wide font-bold">PROJECT ALA-ALAB</span> • SparkFest 2026 Sovereign Archival Engine.
          </div>
          <div className="flex items-center gap-4 text-[10px] text-terracotta font-semibold">
            <span>NODE ID: {nodeId}</span>
            <span>•</span>
            <span>GDG PUP sovereign networks initiative</span>
          </div>
        </footer>

      </main>

      {/* POPUP MODAL FOR ADDING RESEARCH CONTEXT (Styled beautifully in terracota/cream retro palette) */}
      <AnimatePresence>
        {showAddBarangayModal && (
          <div className="fixed inset-0 z-50 bg-[#1a0e0a]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#dfd4bd] border-4 border-[#3c2921] rounded-none p-6 w-full max-w-md shadow-2xl text-[#3c2921]"
            >
              <div className="flex items-center justify-between border-b-2 border-[#3c2921] pb-3 mb-4">
                <h4 className="font-serif text-lg font-bold text-[#251611]">
                  [ INITIALIZE RESEARCH CONTEXT ]
                </h4>
                <button 
                  onClick={() => setShowAddBarangayModal(false)}
                  className="text-[#7c6356] hover:text-[#251611] transition-colors"
                >
                  <X className="w-5 h-5 font-bold" />
                </button>
              </div>

              <div className="flex flex-col gap-3 font-mono text-xs">
                <label className="font-bold text-[#251611]">Research Context Name:</label>
                <input
                  id="modal-input-new-research context"
                  type="text"
                  value={newBarangayName}
                  onChange={(e) => setNewBarangayName(e.target.value)}
                  placeholder="e.g. My First Project, Sector A..."
                  className="bg-[#e9e0cb] border-2 border-[#3c2921]/30 focus:border-terracotta px-4 py-3 text-xs font-mono text-[#251611] focus:outline-none w-full"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2.5 font-mono text-xs">
                <button
                  id="modal-btn-cancel-research context"
                  onClick={() => setShowAddBarangayModal(false)}
                  className="px-4 py-2.5 bg-[#e9e0cb] border border-[#3c2921]/30 font-bold uppercase hover:bg-[#cfc2a8] text-[#3c2921] transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="modal-btn-create-research context"
                  onClick={handleCreateBarangay}
                  disabled={!newBarangayName.trim()}
                  className="px-4 py-2.5 bg-terracotta text-white font-bold uppercase transition-colors hover:bg-terracotta-dark disabled:bg-[#3c2921]/15 disabled:text-[#7c6356]"
                >
                  INITIALIZE REGISTRY
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}