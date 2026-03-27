"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Message, DiagramState } from "@/lib/types";

interface ClarificationData {
  question: string;
  options: string[];
}

interface Props {
  conversationId: string | null;
  messages: Pick<Message, "id" | "role" | "content">[];
  diagramState: DiagramState | null;
  onUserSend: (text: string) => void;
  onAssistantReply: (assistantText: string, newDiagram: DiagramState | null, clarification?: ClarificationData | null) => void;
}

export default function ChatPanel({
  conversationId,
  messages,
  diagramState,
  onUserSend,
  onAssistantReply,
}: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingOptions, setPendingOptions] = useState<ClarificationData | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, pendingOptions]);

  // Clear pending options when conversation changes
  useEffect(() => {
    setPendingOptions(null);
    setSelectedIndex(0);
    setCustomMode(false);
    setCustomText("");
  }, [conversationId]);

  useEffect(() => {
    if (customMode) customInputRef.current?.focus();
  }, [customMode]);

  async function sendMessage(text: string) {
    if (!text || !conversationId || loading) return;
    setLoading(true);
    onUserSend(text);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          user_message: text,
          diagram_state: diagramState,
        }),
      });
      if (!res.ok) { console.error("Chat request failed:", res.statusText); return; }
      const data = await res.json();
      const clarification = data.clarification ?? null;
      setPendingOptions(clarification);
      setSelectedIndex(0);
      onAssistantReply(data.assistantText ?? "", data.newDiagram ?? null, clarification);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessage(text);
  }

  async function selectOption(option: string) {
    setPendingOptions(null);
    setCustomMode(false);
    setCustomText("");
    await sendMessage(option);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!pendingOptions) return;

    const total = pendingOptions.options.length + 2; // options + Skip + Custom
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const skipIndex = pendingOptions.options.length;
      const customIndex = pendingOptions.options.length + 1;
      if (selectedIndex === skipIndex) {
        selectOption("Skip — just use your best judgment and decide for me.");
      } else if (selectedIndex === customIndex) {
        setCustomMode(true);
      } else {
        selectOption(pendingOptions.options[selectedIndex]);
      }
    }
  }

  return (
    <div className="w-80 flex-shrink-0 flex flex-col h-full bg-white border-l border-black/10">
      {/* Header */}
      <div className="px-4 py-3 border-b border-black/8">
        <span className="text-xs font-semibold tracking-widest uppercase text-black/30">Chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && !loading && (
          <p className="text-black/25 text-xs text-center mt-10 leading-relaxed">
            Describe the diagram<br />you want to create
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-black text-white rounded-br-sm"
                  : "bg-black/5 text-black rounded-bl-sm"
              }`}
            >
              {m.role === "user" ? (
                m.content
              ) : (
                <ReactMarkdown
                  components={{
                    p:      ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    ul:     ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                    ol:     ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                    li:     ({ children }) => <li>{children}</li>,
                    h1:     ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                    h2:     ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                    h3:     ({ children }) => <p className="font-medium mb-0.5">{children}</p>,
                    code:   ({ children }) => <code className="bg-black/8 rounded px-1 font-mono text-[10px]">{children}</code>,
                  }}
                >
                  {m.content || "Diagram updated."}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}

        {/* Options picker */}
        {pendingOptions && !loading && (
          <div className="flex justify-start">
            <div className="max-w-[92%] rounded-2xl rounded-bl-sm overflow-hidden border border-black/10">
              {pendingOptions.options.map((opt, i) => (
                <button
                  key={opt}
                  onClick={() => selectOption(opt)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors block ${
                    i === selectedIndex
                      ? "bg-black text-white"
                      : "bg-white text-black hover:bg-black/5"
                  } ${i !== 0 ? "border-t border-black/8" : ""}`}
                >
                  <span className="text-[10px] opacity-40 mr-1.5 font-mono">{i + 1}</span>
                  {opt}
                </button>
              ))}
              <button
                onClick={() => selectOption("Skip — just use your best judgment and decide for me.")}
                className={`w-full text-left px-3 py-2 text-xs transition-colors block border-t border-black/8 ${
                  selectedIndex === pendingOptions.options.length
                    ? "bg-black text-white"
                    : "bg-white text-black/35 hover:bg-black/5 hover:text-black/60"
                }`}
              >
                <span className="text-[10px] opacity-40 mr-1.5 font-mono">↵</span>
                Skip — let Claude decide
              </button>
              {customMode ? (
                <div className="border-t border-black/8 px-3 py-2 flex gap-2 items-center">
                  <input
                    ref={customInputRef}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter" && customText.trim()) selectOption(customText.trim());
                      if (e.key === "Escape") { setCustomMode(false); setCustomText(""); }
                    }}
                    placeholder="Type your answer..."
                    className="flex-1 text-xs outline-none border-b border-black/20 py-0.5 focus:border-black/50 transition-colors bg-transparent placeholder:text-black/25"
                  />
                  <button
                    onClick={() => { if (customText.trim()) selectOption(customText.trim()); }}
                    disabled={!customText.trim()}
                    className="text-[10px] font-medium text-black/40 hover:text-black disabled:opacity-30 transition-colors shrink-0"
                  >
                    Send
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCustomMode(true)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors block border-t border-black/8 ${
                    selectedIndex === pendingOptions.options.length + 1
                      ? "bg-black text-white"
                      : "bg-white text-black/35 hover:bg-black/5 hover:text-black/60"
                  }`}
                >
                  <span className="text-[10px] opacity-40 mr-1.5 font-mono">✎</span>
                  Write my own…
                </button>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-black/5 text-black/40 rounded-2xl rounded-bl-sm px-3 py-2 text-xs">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-black/8 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (pendingOptions) {
              handleKeyDown(e);
            } else if (e.key === "Enter" && !e.shiftKey) {
              handleSubmit(e);
            }
          }}
          placeholder={
            pendingOptions
              ? "↑↓ to navigate, Enter to select"
              : conversationId
              ? "Describe changes..."
              : "Select a diagram first"
          }
          disabled={!conversationId || loading}
          className="flex-1 border border-black/15 rounded-xl px-3 py-2 text-xs text-black outline-none focus:border-black/40 disabled:bg-black/3 disabled:text-black/25 placeholder:text-black/25 transition-colors"
        />
        <button
          type="submit"
          disabled={!conversationId || loading || (!input.trim() && !pendingOptions)}
          className="bg-black hover:bg-black/80 disabled:bg-black/15 text-white disabled:text-black/25 text-xs px-4 py-2 rounded-xl transition-colors font-medium"
        >
          Send
        </button>
      </form>
    </div>
  );
}
