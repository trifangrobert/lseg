"use client";

import { useRef } from "react";
import type { ConversationSummary, DiagramState } from "@/lib/types";

interface Props {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onImport: (diagramState: DiagramState) => void;
}

interface ToggleProps extends Props {
  open: boolean;
  onToggle: () => void;
}

export default function ConversationSidebar({ conversations, activeId, onSelect, onNew, onDelete, onImport, open, onToggle }: ToggleProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    onDelete(id);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as DiagramState;
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          onImport(parsed);
        } else {
          alert("Invalid diagram JSON — expected { nodes, edges }");
        }
      } catch {
        alert("Could not parse JSON file.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  }

  return (
    <div className="relative flex-shrink-0 h-full" style={{ width: open ? 224 : 0, transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)" }}>
      {/* Sidebar panel */}
      <aside
        className="absolute inset-y-0 left-0 w-56 bg-black text-white flex flex-col h-full border-r border-white/10 overflow-hidden"
        style={{ transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <div className="p-4 border-b border-white/10">
          <div className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-3">
            Diagram AI
          </div>
          <div className="flex gap-2">
            <button
              onClick={onNew}
              className="flex-1 border border-white/20 hover:border-white/60 hover:bg-white/5 text-white text-xs font-medium py-2 px-3 rounded transition-colors tracking-wide"
            >
              + New
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import JSON"
              className="border border-white/20 hover:border-white/60 hover:bg-white/5 text-white/60 hover:text-white text-xs font-medium py-2 px-2.5 rounded transition-colors"
            >
              <svg width={13} height={13} viewBox="0 0 13 13" fill="none"><path d="M6.5 1v7M3.5 5l3 3 3-3M1 11h11" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 6.5 6.5)"/></svg>
            </button>
            <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 && (
            <p className="text-white/25 text-xs px-4 py-3">No diagrams yet.</p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`group flex items-center gap-1 px-3 py-2.5 cursor-pointer transition-colors ${
                activeId === c.id ? "bg-white text-black" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs font-medium">
                  {c.title ?? "Untitled"}
                </div>
                <div className={`text-xs mt-0.5 ${activeId === c.id ? "text-black/40" : "text-white/25"}`}>
                  {new Date(c.updated_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(e, c.id)}
                className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-white/10 ${activeId === c.id ? "hover:bg-black/10 text-black/50 hover:text-black" : "text-white/40 hover:text-white"}`}
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Toggle tab — always visible on the right edge */}
      <button
        onClick={onToggle}
        className="absolute top-1/2 -translate-y-1/2 -right-3 z-20 w-3 h-14 bg-black hover:bg-white/90 hover:text-black text-white/50 rounded-r-md flex items-center justify-center transition-colors group"
        title={open ? "Hide sidebar" : "Show sidebar"}
        style={{ transition: "background 0.15s, color 0.15s, right 0.25s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <svg width={6} height={10} viewBox="0 0 6 10" fill="none" className="transition-transform" style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.25s" }}>
          <path d="M5 1L1 5l4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}
