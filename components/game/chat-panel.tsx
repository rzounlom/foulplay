"use client";

import { useRef, useEffect, useState } from "react";

export interface ChatMessage {
  id: string;
  message: string;
  createdAt: string;
  sender: {
    id: string;
    nickname?: string | null;
    user: { id: string; name: string };
  };
}

interface ChatPanelProps {
  roomCode: string;
  messages: ChatMessage[];
  currentPlayerId: string | undefined;
  onSendMessage: (text: string) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({
  roomCode,
  messages,
  currentPlayerId,
  onSendMessage,
  isOpen,
  onClose,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSendMessage(text);
      setInput("");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-xl z-40 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="font-semibold text-neutral-800 dark:text-neutral-200">Chat</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
          aria-label="Close chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No messages yet. Say something!</p>
        ) : (
          messages.map((m) => {
            const isMe = currentPlayerId && m.sender.id === currentPlayerId;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {m.sender.nickname || m.sender.user.name}
                  {isMe ? " (you)" : ""}
                </span>
                <div
                  className={`rounded-lg px-3 py-2 max-w-[85%] ${
                    isMe
                      ? "bg-primary text-white"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                  }`}
                >
                  <p className="text-sm break-words">{m.message}</p>
                </div>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  {new Date(m.createdAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-neutral-200 dark:border-neutral-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
