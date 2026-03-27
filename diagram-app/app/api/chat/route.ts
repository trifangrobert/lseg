import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  anthropic,
  RENDER_DIAGRAM_TOOL,
  ASK_CLARIFICATION_TOOL,
  buildSystemPrompt,
  buildAnthropicMessages,
} from "@/lib/claude";
import type { DiagramState, Message } from "@/lib/types";

export async function POST(request: Request) {
  const {
    conversation_id,
    user_message,
    diagram_state,
  }: {
    conversation_id: string;
    user_message: string;
    diagram_state: DiagramState | null;
  } = await request.json();

  const supabase = getSupabaseServerClient();

  // Load existing messages from DB
  const { data: existingMessages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true });

  const history: Pick<Message, "role" | "content">[] = existingMessages ?? [];

  // Build messages array for Claude
  const anthropicMessages = [
    ...buildAnthropicMessages(history),
    { role: "user" as const, content: user_message },
  ];

  // Call Claude
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: buildSystemPrompt(diagram_state),
    tools: [ASK_CLARIFICATION_TOOL, RENDER_DIAGRAM_TOOL],
    messages: anthropicMessages,
  });

  // Extract tool calls and text
  let newDiagram: DiagramState | null = null;
  let clarification: { question: string; options: string[] } | null = null;
  let assistantText = "";

  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "render_diagram") {
      newDiagram = block.input as DiagramState;
    } else if (block.type === "tool_use" && block.name === "ask_clarification") {
      clarification = block.input as { question: string; options: string[] };
    } else if (block.type === "text") {
      assistantText += block.text;
    }
  }

  // Persist user message
  await supabase.from("messages").insert({
    conversation_id,
    role: "user",
    content: user_message,
  });

  // Persist assistant message
  await supabase.from("messages").insert({
    conversation_id,
    role: "assistant",
    content: assistantText,
  });

  // Update diagram state and conversation timestamp
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (newDiagram) updates.diagram_state = newDiagram;

  // Set title from first user message if not already set
  const { data: conv } = await supabase
    .from("conversations")
    .select("title")
    .eq("id", conversation_id)
    .single();

  if (!conv?.title) {
    updates.title = user_message.slice(0, 60);
  }

  await supabase.from("conversations").update(updates).eq("id", conversation_id);

  return NextResponse.json({ assistantText, newDiagram, clarification });
}
