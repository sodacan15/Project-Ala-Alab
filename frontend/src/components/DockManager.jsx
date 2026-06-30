import React, { useState, useEffect } from 'react';
import DockWindow from './DockWindow.jsx';
import './DockManager.css';

export default function DockManager({ user }) {
  const [docks, setDocks] = useState(new Map());
  const [positions, setPositions] = useState(new Map());

  // Initialize dock positions
  useEffect(() => {
    const newPositions = new Map();
    let offset = 50;

    ['Gemini', 'Claude', 'NotebookLM'].forEach((agent, idx) => {
      newPositions.set(agent, {
        x: offset + idx * 320,
        y: 100 + idx * 30
      });
    });

    setPositions(newPositions);
  }, []);

  const openDock = (agentName) => {
    if (!docks.has(agentName)) {
      setDocks(prev => new Map(prev).set(agentName, { minimized: false }));
    } else {
      const dock = docks.get(agentName);
      setDocks(prev => new Map(prev).set(agentName, { minimized: false }));
    }
  };

  const closeDock = (agentName) => {
    setDocks(prev => {
      const newMap = new Map(prev);
      newMap.delete(agentName);
      return newMap;
    });
  };

  const toggleMinimize = (agentName, minimized) => {
    setDocks(prev => new Map(prev).set(agentName, { minimized }));
  };

  const updatePosition = (agentName, newPosition) => {
    setPositions(prev => new Map(prev).set(agentName, newPosition));
  };

  const getAgentInfo = (agentName) => {
    const agent = user?.agents?.[agentName];
    if (!agent) return { displayName: agentName, connected: false };
    return {
      displayName: agent.displayName || agentName,
      connected: agent.connected
    };
  };

  return (
    <div className="dock-manager">
      <div className="dock-taskbar">
        <div className="dock-taskbar-title">Agent Dock Manager</div>
        <div className="dock-taskbar-agents">
          {['Gemini', 'Claude', 'NotebookLM'].map(agentName => {
            const isDocked = docks.has(agentName);
            const isMinimized = isDocked && docks.get(agentName).minimized;
            const { displayName, connected } = getAgentInfo(agentName);

            return (
              <button
                key={agentName}
                className={`dock-taskbar-btn ${
                  isDocked ? 'active' : ''
                } ${isMinimized ? 'minimized' : ''} ${connected ? 'connected' : 'disconnected'}`}
                onClick={() => isDocked ? toggleMinimize(agentName, false) : openDock(agentName)}
                title={`${connected ? '✓' : '✗'} ${displayName} (${agentName})`}
              >
                <span className="dock-taskbar-icon">
                  {agentName === 'Gemini' && '✨'}
                  {agentName === 'Claude' && '🧠'}
                  {agentName === 'NotebookLM' && '📚'}
                </span>
                <span className="dock-taskbar-label">{displayName}</span>
                {isDocked && <span className="dock-taskbar-indicator" />}
              </button>
            );
          })}
        </div>
      </div>

      {Array.from(docks.entries()).map(([agentName, dock]) => {
        const position = positions.get(agentName) || { x: 50, y: 100 };
        const { displayName } = getAgentInfo(agentName);

        return (
          <DockWindow
            key={agentName}
            id={agentName}
            agentName={agentName}
            displayName={displayName}
            onClose={() => closeDock(agentName)}
            onMinimize={(minimized) => toggleMinimize(agentName, minimized)}
            isMinimized={dock.minimized}
            position={position}
            onPositionChange={(newPos) => updatePosition(agentName, newPos)}
          />
        );
      })}
    </div>
  );
}
