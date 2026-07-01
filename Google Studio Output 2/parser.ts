import { useState, useEffect, useRef } from 'react';
import { TabInfo, SyncPacket, ChatSession } from '../types';

const CHANNEL_NAME = 'llm_chat_bridge_channel';

export function useTabBridge() {
  const [tabId] = useState(() => `tab-${Math.random().toString(36).substring(2, 11)}`);
  const [tabName, setTabName] = useState(() => {
    const saved = localStorage.getItem('llm_bridge_tab_name');
    if (saved) return saved;
    const isGemini = window.location.hash.includes('gemini');
    const isClaude = window.location.hash.includes('claude');
    if (isGemini) return 'Gemini Tab';
    if (isClaude) return 'Claude Tab';
    return `Tab ${Math.floor(Math.random() * 900 + 100)}`;
  });
  
  const [tabRole, setTabRole] = useState<'gemini_companion' | 'claude_companion' | 'neutral'>(() => {
    const saved = localStorage.getItem('llm_bridge_tab_role');
    if (saved === 'gemini_companion' || saved === 'claude_companion' || saved === 'neutral') {
      return saved;
    }
    const isGemini = window.location.hash.includes('gemini');
    const isClaude = window.location.hash.includes('claude');
    if (isGemini) return 'gemini_companion';
    if (isClaude) return 'claude_companion';
    return 'neutral';
  });

  const [connectedTabs, setConnectedTabs] = useState<TabInfo[]>([]);
  const [incomingPacket, setIncomingPacket] = useState<SyncPacket | null>(null);
  const [beamingActive, setBeamingActive] = useState(false);
  const [sentHistory, setSentHistory] = useState<SyncPacket[]>(() => {
    const saved = localStorage.getItem('llm_bridge_sent_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [receivedHistory, setReceivedHistory] = useState<SyncPacket[]>(() => {
    const saved = localStorage.getItem('llm_bridge_received_history');
    return saved ? JSON.parse(saved) : [];
  });

  const channelRef = useRef<BroadcastChannel | null>(null);

  // Persistence triggers
  useEffect(() => {
    localStorage.setItem('llm_bridge_tab_name', tabName);
  }, [tabName]);

  useEffect(() => {
    localStorage.setItem('llm_bridge_tab_role', tabRole);
  }, [tabRole]);

  useEffect(() => {
    localStorage.setItem('llm_bridge_sent_history', JSON.stringify(sentHistory));
  }, [sentHistory]);

  useEffect(() => {
    localStorage.setItem('llm_bridge_received_history', JSON.stringify(receivedHistory));
  }, [receivedHistory]);

  // Set up Broadcast Channel and handle signaling
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    // Local function to announce self to other tabs
    const announceSelf = (action: 'ping' | 'pong' | 'bye') => {
      channel.postMessage({
        type: 'TAB_SIGNAL',
        action,
        tab: {
          id: tabId,
          name: tabName,
          role: tabRole,
          lastActive: Date.now(),
          isCurrent: false,
        },
      });
    };

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      // Handle Tab Discovery Signals
      if (data.type === 'TAB_SIGNAL') {
        const peer: TabInfo = data.tab;
        
        if (peer.id === tabId) return; // Ignore self

        if (data.action === 'ping') {
          // Send pong back so the newcomer knows we exist
          announceSelf('pong');
          // Update connected list
          setConnectedTabs(prev => {
            if (prev.some(t => t.id === peer.id)) {
              return prev.map(t => t.id === peer.id ? { ...peer, lastActive: Date.now() } : t);
            }
            return [...prev, peer];
          });
        } else if (data.action === 'pong') {
          setConnectedTabs(prev => {
            if (prev.some(t => t.id === peer.id)) {
              return prev.map(t => t.id === peer.id ? { ...peer, lastActive: Date.now() } : t);
            }
            return [...prev, peer];
          });
        } else if (data.action === 'bye') {
          setConnectedTabs(prev => prev.filter(t => t.id !== peer.id));
        }
      }

      // Handle Data Sync Beaming
      if (data.type === 'BEAM_PACKET') {
        const packet: SyncPacket = data.packet;
        
        // Check if role filter applies
        if (packet.targetRole && packet.targetRole !== 'neutral' && packet.targetRole !== tabRole) {
          // Packet was targeted, and this tab is not of that role, ignore
          return;
        }

        // Add to received log
        setReceivedHistory(prev => [packet, ...prev].slice(0, 30));
        setIncomingPacket(packet);

        // Flash desktop notification if supported and permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`LLM Chat Bridge: Context Beamed!`, {
            body: `Received "${packet.session.title}" from ${packet.senderTabName}.`,
          });
        }
      }
    };

    channel.addEventListener('message', handleMessage);

    // Initial announce (ping)
    announceSelf('ping');

    // Heartbeat check (ping every 4 seconds to clear dead tabs)
    const interval = setInterval(() => {
      announceSelf('pong');
    }, 4000);

    // Clean exit
    const handleBeforeUnload = () => {
      announceSelf('bye');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      announceSelf('bye');
      channel.removeEventListener('message', handleMessage);
      channel.close();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [tabId, tabName, tabRole]);

  // Force discovery refresh
  const triggerDiscovery = () => {
    if (channelRef.current) {
      setConnectedTabs([]);
      channelRef.current.postMessage({
        type: 'TAB_SIGNAL',
        action: 'ping',
        tab: {
          id: tabId,
          name: tabName,
          role: tabRole,
          lastActive: Date.now(),
          isCurrent: false,
        },
      });
    }
  };

  // Announce name or role changes immediately
  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'TAB_SIGNAL',
        action: 'pong',
        tab: {
          id: tabId,
          name: tabName,
          role: tabRole,
          lastActive: Date.now(),
          isCurrent: false,
        },
      });
    }
  }, [tabName, tabRole, tabId]);

  // Beam a parsed session to other tabs
  const beamSession = (session: ChatSession, targetRole?: string, note?: string) => {
    if (!channelRef.current) return false;

    setBeamingActive(true);

    const packet: SyncPacket = {
      id: `packet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      senderTabId: tabId,
      senderTabName: tabName,
      targetRole,
      session,
      timestamp: Date.now(),
      note,
    };

    channelRef.current.postMessage({
      type: 'BEAM_PACKET',
      packet,
    });

    // Add to sent history
    setSentHistory(prev => [packet, ...prev].slice(0, 30));

    setTimeout(() => {
      setBeamingActive(false);
    }, 800);

    return true;
  };

  const clearHistory = () => {
    setSentHistory([]);
    setReceivedHistory([]);
    setIncomingPacket(null);
    localStorage.removeItem('llm_bridge_sent_history');
    localStorage.removeItem('llm_bridge_received_history');
  };

  return {
    tabId,
    tabName,
    setTabName,
    tabRole,
    setTabRole,
    connectedTabs,
    incomingPacket,
    setIncomingPacket,
    beamingActive,
    beamSession,
    sentHistory,
    receivedHistory,
    clearHistory,
    triggerDiscovery,
  };
}
