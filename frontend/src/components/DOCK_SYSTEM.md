# Dock System Implementation

## Overview

The Dock system provides embedded, draggable chat windows for each AI agent (Gemini, Claude, NotebookLM) directly within the Ala-Alab interface. Users can open, close, minimize, and reposition agent windows without leaving the main application.

## Components

### DockWindow.jsx
- Individual draggable chat window for one agent
- Features:
  - Real-time message streaming
  - Minimize/restore capability
  - Drag-and-drop positioning
  - Auto-scroll to latest message
  - Load state indicators
  - Error handling

### DockManager.jsx
- Manages lifecycle of all dock windows
- Features:
  - Taskbar showing all available agents
  - Agent connectivity status display
  - Window position management
  - Minimize/restore shortcuts
  - Visual indicators for active/inactive agents

## Usage

### Opening an Agent
1. Click the agent button in the dock taskbar (bottom of screen)
2. Agent window appears on screen
3. Start typing to interact with the agent

### Positioning
- Drag windows by their header to reposition
- Windows remember positions during session
- Multiple windows can be open simultaneously

### Minimizing
- Click the "−" button to minimize
- Click taskbar button to restore
- Minimized windows appear as small buttons on screen

### Messages
- User messages appear in light beige with "👤 You" label
- Agent responses appear in light teal with agent icon
- Errors appear in light red with "⚠️ Error" label
- Loading indicator shows during processing

## Integration with Main App

The DockManager is rendered at the top level of the App component:

```jsx
{dockEnabled && <DockManager user={user} />}
```

Toggle button in sidebar allows users to show/hide the dock system entirely.

## Styling

All colors match Ala-Alab's earth-tone palette:
- Background: #faf8f6 (cream)
- Accents: #8fbfb0 (sage green)
- Headers: #3d2817 (dark brown)
- Text: #333 (dark gray)

## API Integration

Dock windows communicate with backend via:

- `POST /agents/{agentName}/message` - Send message
- `POST /agents/{agentName}/stream` - Stream response
- `GET /agents/status` - Check agent status
- `POST /agents/{agentName}/clear` - Clear history

All requests include:
- Session ID in headers or cookies
- Proper error handling with user feedback
- Loading states during processing
