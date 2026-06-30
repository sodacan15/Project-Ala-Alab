import React, { useState, useEffect, useRef } from 'react';
import './DockWindow.css';

export default function DockWindow({
  id,
  agentName,
  displayName,
  onClose,
  onMinimize,
  isMinimized,
  position,
  onPositionChange
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState({ width: 400, height: 500 });
  const messagesEndRef = useRef(null);
  const windowRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`/agents/${agentName}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'error', content: `Error: ${data.error}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', content: `Connection error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.dock-header')) {
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      setIsResizing(true);
    }
  };

  const handleMouseMove = (e) => {
    if (isResizing && windowRef.current) {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      onPositionChange({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, position]);

  if (isMinimized) {
    return (
      <div
        className="dock-window-minimized"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`
        }}
      >
        <button
          className="dock-minimize-btn"
          onClick={() => onMinimize(false)}
          title={`Open ${displayName}`}
        >
          {displayName}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={windowRef}
      className="dock-window"
      style={{
        width: `${size.width}px`,
        height: `${size.height}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: isResizing ? 9999 : 1000
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="dock-header">
        <div className="dock-title">
          <span className="dock-agent-name">🤖 {displayName}</span>
          <span className="dock-agent-type">({agentName})</span>
        </div>
        <div className="dock-controls">
          <button
            className="dock-btn dock-minimize"
            onClick={() => onMinimize(true)}
            title="Minimize"
          >
            −
          </button>
          <button
            className="dock-btn dock-close"
            onClick={() => onClose()}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="dock-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`dock-message dock-message-${msg.role}`}>
            <div className="dock-message-label">
              {msg.role === 'user' ? '👤 You' : msg.role === 'assistant' ? `🤖 ${agentName}` : '⚠️ Error'}
            </div>
            <div className="dock-message-content">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="dock-message dock-message-loading">
            <div className="dock-loader">●●●</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="dock-input-area">
        <input
          type="text"
          className="dock-input"
          placeholder={`Ask ${displayName}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
          disabled={loading}
        />
        <button
          className="dock-send-btn"
          onClick={handleSendMessage}
          disabled={!input.trim() || loading}
        >
          {loading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}
