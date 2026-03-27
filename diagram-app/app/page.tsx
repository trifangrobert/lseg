"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import ConversationSidebar from "@/components/ConversationSidebar";
import ChatPanel from "@/components/ChatPanel";
import type { ConversationSummary, DiagramState, Message } from "@/lib/types";

// React Flow requires browser APIs — disable SSR
const DiagramCanvas = dynamic(() => import("@/components/DiagramCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
      Loading canvas...
    </div>
  ),
});

export default function HomePage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Pick<Message, "id" | "role" | "content">[]>([]);
  const [diagramState, setDiagramState] = useState<DiagramState | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load conversation list on mount
  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setConversations)
      .catch(console.error);
  }, []);

  // Load a conversation when selected
  async function selectConversation(id: string) {
    setActiveId(id);
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(
      (data.messages as Message[]).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      }))
    );
    setDiagramState(data.conversation.diagram_state ?? null);
  }

  // Create a new conversation
  async function createNewConversation() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: null }),
    });
    if (!res.ok) { console.error("Failed to create conversation"); return; }
    const conv = await res.json();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setMessages([]);
    setDiagramState(null);
  }

  // Import a diagram JSON into a new conversation
  async function importDiagram(imported: DiagramState) {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Imported diagram" }),
    });
    if (!res.ok) { console.error("Failed to create conversation"); return; }
    const conv = await res.json();
    await fetch(`/api/conversations/${conv.id}/diagram`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagram_state: imported }),
    });
    setConversations((prev) => [{ ...conv, title: "Imported diagram" }, ...prev]);
    setActiveId(conv.id);
    setMessages([]);
    setDiagramState(imported);
  }

  function handleUserSend(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user" as const, content: text }]);
    // Optimistically set sidebar title from first message
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, title: c.title ?? text.slice(0, 60) } : c
      )
    );
  }

  function handleAssistantReply(
    assistantText: string,
    newDiagram: DiagramState | null,
    clarification?: { question: string; options: string[] } | null
  ) {
    const content = clarification
      ? `**${clarification.question}**`
      : assistantText;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant" as const, content },
    ]);
    if (newDiagram) setDiagramState(newDiagram);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, updated_at: new Date().toISOString() } : c
      )
    );
  }

  // Persist manual diagram edits (debounced inside DiagramCanvas)
  const diagramPersistRef = useRef<AbortController | null>(null);

  const handleDiagramChange = useCallback(
    (state: DiagramState) => {
      setDiagramState(state);
      if (!activeId) return;
      diagramPersistRef.current?.abort();
      diagramPersistRef.current = new AbortController();
      fetch(`/api/conversations/${activeId}/diagram`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagram_state: state }),
        signal: diagramPersistRef.current.signal,
      }).catch(() => {});
    },
    [activeId]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={createNewConversation}
        onImport={importDiagram}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onDelete={(id) => {
          setConversations((prev) => prev.filter((c) => c.id !== id));
          if (activeId === id) {
            setActiveId(null);
            setMessages([]);
            setDiagramState(null);
          }
        }}
      />

      <main className="flex flex-1 overflow-hidden">
        {activeId ? (
          <>
            <DiagramCanvas
              diagramState={diagramState}
              onDiagramChange={handleDiagramChange}
            />
            <ChatPanel
              conversationId={activeId}
              messages={messages}
              diagramState={diagramState}
              onUserSend={handleUserSend}
              onAssistantReply={(text, diagram, clarification) =>
                handleAssistantReply(text, diagram, clarification)
              }
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#fafafa]">
            <div className="text-4xl text-black/10">◇</div>
            <p className="text-xs text-black/25 tracking-wide">Create a new diagram or select one from the sidebar</p>
          </div>
        )}
      </main>
    </div>
  );
}
