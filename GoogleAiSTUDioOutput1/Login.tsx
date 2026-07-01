export interface ClipboardBuffer {
  content: string;
  savedAt: string;
  fromSession: string;
  type: string;
  formattedBlock?: string;
}

let clipboardBuffer: ClipboardBuffer | null = null;

export function getClipboard(): ClipboardBuffer | null {
  return clipboardBuffer;
}

export function setClipboard(content: string, fromSession: string, type: string, formattedBlock?: string): ClipboardBuffer {
  clipboardBuffer = {
    content,
    savedAt: new Date().toISOString(),
    fromSession,
    type,
    formattedBlock
  };
  return clipboardBuffer;
}

export function clearClipboard(): void {
  clipboardBuffer = null;
}
