import type { Node, Edge } from "@xyflow/react";

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface DiagramState {
  nodes: Node[];
  edges: Edge[];
}

export interface Conversation {
  id: string;
  title: string | null;
  diagram_state: DiagramState | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}
