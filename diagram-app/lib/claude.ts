import Anthropic from "@anthropic-ai/sdk";
import type { DiagramState, Message } from "./types";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxRetries: 3,
});

export const ASK_CLARIFICATION_TOOL: Anthropic.Tool = {
  name: "ask_clarification",
  description:
    "Ask the user a clarifying question with a list of selectable options. Use this instead of plain text when you need to clarify before drawing.",
  input_schema: {
    type: "object" as const,
    properties: {
      question: { type: "string", description: "The clarifying question to ask" },
      options:  { type: "array", items: { type: "string" }, description: "2–5 options for the user to pick from" },
    },
    required: ["question", "options"],
  },
};

export const RENDER_DIAGRAM_TOOL: Anthropic.Tool = {
  name: "render_diagram",
  description:
    "Render or update the diagram canvas with the given nodes and edges. Always call this tool when the user requests a diagram or any change to it.",
  input_schema: {
    type: "object" as const,
    properties: {
      nodes: {
        type: "array",
        description: "React Flow nodes",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            position: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
              },
              required: ["x", "y"],
            },
            data: {
              type: "object",
              properties: {
                label: { type: "string" },
              },
              required: ["label"],
            },
          },
          required: ["id", "position", "data"],
        },
      },
      edges: {
        type: "array",
        description: "React Flow edges. Always set sourceHandle and targetHandle explicitly.",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            source: { type: "string" },
            target: { type: "string" },
            sourceHandle: { type: "string", enum: ["top", "bottom", "left", "right"] },
            targetHandle: { type: "string", enum: ["top-t", "bottom-t", "left-t", "right-t"] },
            label: { type: "string" },
          },
          required: ["id", "source", "target", "sourceHandle", "targetHandle"],
        },
      },
    },
    required: ["nodes", "edges"],
  },
};

export function buildSystemPrompt(diagramState: DiagramState | null): string {
  const diagramContext = diagramState
    ? `\n\nCurrent diagram state:\n${JSON.stringify(diagramState, null, 2)}`
    : "\n\nCurrent diagram state: empty (no diagram yet)";

  return `You are a diagram assistant. Help users create and edit diagrams through conversation.

Rules:
- Before drawing, evaluate whether the request is specific enough. Ask 1–2 short clarifying questions if ANY of these are true:
    • The components or steps are not explicitly listed (e.g. "design a system for X" without naming the parts)
    • The relationships or data flow between nodes are unclear
    • The type of diagram is ambiguous (flowchart vs architecture vs sequence)
  Do NOT ask if the user already named the nodes and connections clearly.
- If you need to ask, call ask_clarification with the question and 2–5 options. Do NOT call render_diagram in the same turn.
- If the request is clear, first write a short plan (2–4 bullet points) outlining the nodes and flow you are about to draw, then immediately call render_diagram in the same response. Do NOT ask anything.
- When updating an existing diagram, always return the FULL updated diagram (all nodes and edges), not just the changes.
- Layout nodes with x/y coordinates spaced 150-200px apart for readability. Use a logical flow direction (top-to-bottom or left-to-right).
- The user may have spelling errors or typos — infer their intent.
- After calling render_diagram, do NOT add another message — the plan you wrote before the tool call is sufficient.
- Node types available — set the "type" field accordingly:
  "rectangle" (process/action step, indigo)
  "diamond" (decision/branch, amber)
  "circle" (terminal/event, teal circle)
  "stadium" (start or end, gray pill)
  "tool" (external tool/service/API call, red)
  "classifier" (orchestrator/router/classifier, green)
  "database" (data store, DB, cache, violet cylinder)
  "queue" (message queue, event bus, cyan pipe)
  "cloud" (internet, external cloud service/provider, sky blue)
  "document" (file, report, output artifact, slate wavy)
  "io" (input/output data flow, orange parallelogram)
  "hexagon" (preparation, initialization, config, lime)
  "note" (annotation/comment, yellow folded corner)
  "trapezoid" (manual/human operation, gray)
  "actor" (user, person, stakeholder, pink person icon)
- Edge handles: each node has handles "top", "bottom", "left", "right" as sources, and "top-t", "bottom-t", "left-t", "right-t" as targets. Always set sourceHandle and targetHandle on every edge. For top-to-bottom flows use sourceHandle="bottom" and targetHandle="top-t". For left-to-right flows use sourceHandle="right" and targetHandle="left-t".
${diagramContext}`;
}

export function buildAnthropicMessages(
  messages: Pick<Message, "role" | "content">[]
): Anthropic.MessageParam[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}
