"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  return (
    <div
      className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface border-l border-border shadow-xl dark:shadow-none z-40 flex flex-col min-w-0 overflow-hidden transition-transform duration-300 ease-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      } ${!isOpen ? "pointer-events-none" : ""}`}
      aria-hidden={!isOpen}
    >
      <div className="flex items-center justify-between p-3 border-b border-border shrink-0 min-w-0">
        <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 truncate min-w-0">Chat</h3>
        <Button
          type="button"
          variant="tertiary"
          size="sm"
          onClick={onClose}
          className="p-2 min-w-0"
          aria-label="Close chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 min-h-0 min-w-0">
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
      <form onSubmit={handleSubmit} className="p-3 border-t border-border shrink-0 min-w-0">
        <div className="flex gap-2 min-w-0">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
            className="flex-1 min-w-0"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!input.trim()}
            isLoading={sending}
            className="shrink-0"
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
