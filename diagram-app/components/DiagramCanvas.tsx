"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  BackgroundVariant,
  ConnectionMode,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  NodeToolbar,
  Panel,
  type Node,
  type Edge,
  type EdgeProps,
  type Connection,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { DiagramState } from "@/lib/types";

// ── Context for propagating diagram changes from edge components ─────────
const DiagramChangeCtx = createContext<(nodes: Node[], edges: Edge[]) => void>(() => {});

// ── Editable edge ─────────────────────────────────────────────────────────
function EditableEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, selected,
  markerEnd, markerStart,
}: EdgeProps) {
  const { setEdges, getNodes } = useReactFlow();
  const notifyChange = useContext(DiagramChangeCtx);
  const [editing, setEditing] = useState(false);
  const [localLabel, setLocalLabel] = useState((label as string) ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocalLabel((label as string) ?? ""); }, [label]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  function commit(value: string) {
    setEdges((eds) => {
      const updated = eds.map((e) => e.id === id ? { ...e, label: value } : e);
      notifyChange(getNodes(), updated);
      return updated;
    });
    setEditing(false);
  }

  const showLabel = localLabel || editing;
  const showHint = !localLabel && !editing && selected;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} markerStart={markerStart} />
      <EdgeLabelRenderer>
        <div
          style={{ position: "absolute", transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, pointerEvents: "all" }}
          className="nodrag nopan"
        >
          {editing ? (
            <input
              ref={inputRef}
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              onBlur={() => commit(localLabel)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commit(localLabel); }
                if (e.key === "Escape") { setLocalLabel((label as string) ?? ""); setEditing(false); }
              }}
              className="text-[11px] text-center outline-none bg-white border border-slate-300 rounded-full px-2.5 py-0.5 w-28 shadow-sm"
            />
          ) : showLabel ? (
            <div
              onDoubleClick={() => setEditing(true)}
              className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 rounded-full px-2.5 py-0.5 shadow-sm cursor-pointer select-none whitespace-nowrap max-w-[140px] truncate"
              title={localLabel}
            >
              {localLabel}
            </div>
          ) : showHint ? (
            <div
              onDoubleClick={() => setEditing(true)}
              className="text-[11px] text-slate-300 border border-dashed border-slate-200 rounded-full px-2 py-0.5 cursor-pointer select-none"
            >
              + label
            </div>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { default: EditableEdge };

// ── Shared label editor ──────────────────────────────────────────────────
function useEditableLabel(initial: string) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setLabel(initial); }, [initial]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  return { editing, setEditing, label, setLabel, inputRef };
}

function LabelInput({ label, setLabel, setEditing, inputRef, data, color }: {
  label: string;
  setLabel: (v: string) => void;
  setEditing: (v: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  data: NodeProps["data"];
  color: string;
}) {
  return (
    <input
      ref={inputRef}
      value={label}
      onChange={(e) => setLabel(e.target.value)}
      onBlur={() => { setEditing(false); (data as Record<string, unknown>).label = label; }}
      onKeyDown={(e) => { if (e.key === "Enter") inputRef.current?.blur(); }}
      className={`text-xs font-semibold text-center outline-none bg-transparent w-full border-b ${color}`}
    />
  );
}

// Color palettes — muted, easy on the eyes
const PALETTES = {
  process:    { bg: "rgba(99,102,241,0.07)",  border: "rgba(99,102,241,0.22)",  selectedBorder: "rgba(99,102,241,0.5)",  text: "#3730a3" },
  decision:   { bg: "rgba(234,179,8,0.08)",   border: "rgba(234,179,8,0.25)",   selectedBorder: "rgba(234,179,8,0.55)",  text: "#713f12" },
  terminal:   { bg: "rgba(20,184,166,0.08)",  border: "rgba(20,184,166,0.25)",  selectedBorder: "rgba(20,184,166,0.55)", text: "#134e4a" },
  tool:       { bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.22)",   selectedBorder: "rgba(239,68,68,0.5)",   text: "#7f1d1d" },
  classifier: { bg: "rgba(34,197,94,0.07)",   border: "rgba(34,197,94,0.22)",   selectedBorder: "rgba(34,197,94,0.5)",   text: "#14532d" },
  database:   { bg: "rgba(139,92,246,0.07)",  border: "rgba(139,92,246,0.25)",  selectedBorder: "rgba(139,92,246,0.55)", text: "#4c1d95" },
  document:   { bg: "rgba(100,116,139,0.07)", border: "rgba(100,116,139,0.25)", selectedBorder: "rgba(100,116,139,0.55)",text: "#1e293b" },
  io:         { bg: "rgba(249,115,22,0.07)",  border: "rgba(249,115,22,0.25)",  selectedBorder: "rgba(249,115,22,0.55)", text: "#7c2d12" },
  cloud:      { bg: "rgba(14,165,233,0.07)",  border: "rgba(14,165,233,0.25)",  selectedBorder: "rgba(14,165,233,0.55)", text: "#0c4a6e" },
  queue:      { bg: "rgba(6,182,212,0.07)",   border: "rgba(6,182,212,0.25)",   selectedBorder: "rgba(6,182,212,0.55)",  text: "#164e63" },
  actor:      { bg: "rgba(236,72,153,0.07)",  border: "rgba(236,72,153,0.22)",  selectedBorder: "rgba(236,72,153,0.5)",  text: "#831843" },
  hexagon:    { bg: "rgba(132,204,22,0.08)",  border: "rgba(132,204,22,0.28)",  selectedBorder: "rgba(132,204,22,0.58)", text: "#365314" },
  stadium:    { bg: "rgba(107,114,128,0.07)", border: "rgba(107,114,128,0.22)", selectedBorder: "rgba(107,114,128,0.5)", text: "#1f2937" },
  note:       { bg: "rgba(250,204,21,0.1)",   border: "rgba(250,204,21,0.38)",  selectedBorder: "rgba(250,204,21,0.65)", text: "#713f12" },
  trapezoid:  { bg: "rgba(120,113,108,0.07)", border: "rgba(120,113,108,0.25)", selectedBorder: "rgba(120,113,108,0.5)", text: "#292524" },
};

// ── Color presets ─────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { id: "indigo",  dot: "#6366f1", bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.25)",  selectedBorder: "rgba(99,102,241,0.6)",  text: "#3730a3" },
  { id: "violet",  dot: "#8b5cf6", bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.25)",  selectedBorder: "rgba(139,92,246,0.6)",  text: "#4c1d95" },
  { id: "rose",    dot: "#f43f5e", bg: "rgba(244,63,94,0.08)",   border: "rgba(244,63,94,0.25)",   selectedBorder: "rgba(244,63,94,0.6)",   text: "#881337" },
  { id: "orange",  dot: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.25)",  selectedBorder: "rgba(249,115,22,0.6)",  text: "#7c2d12" },
  { id: "amber",   dot: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)",  selectedBorder: "rgba(245,158,11,0.6)",  text: "#78350f" },
  { id: "lime",    dot: "#84cc16", bg: "rgba(132,204,22,0.08)",  border: "rgba(132,204,22,0.28)",  selectedBorder: "rgba(132,204,22,0.6)",  text: "#365314" },
  { id: "emerald", dot: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)",  selectedBorder: "rgba(16,185,129,0.6)",  text: "#064e3b" },
  { id: "teal",    dot: "#14b8a6", bg: "rgba(20,184,166,0.08)",  border: "rgba(20,184,166,0.25)",  selectedBorder: "rgba(20,184,166,0.6)",  text: "#134e4a" },
  { id: "sky",     dot: "#0ea5e9", bg: "rgba(14,165,233,0.08)",  border: "rgba(14,165,233,0.25)",  selectedBorder: "rgba(14,165,233,0.6)",  text: "#0c4a6e" },
  { id: "pink",    dot: "#ec4899", bg: "rgba(236,72,153,0.08)",  border: "rgba(236,72,153,0.25)",  selectedBorder: "rgba(236,72,153,0.6)",  text: "#831843" },
  { id: "slate",   dot: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.25)", selectedBorder: "rgba(100,116,139,0.6)", text: "#1e293b" },
  { id: "red",     dot: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)",   selectedBorder: "rgba(239,68,68,0.6)",   text: "#7f1d1d" },
];

type PaletteEntry = { bg: string; border: string; selectedBorder: string; text: string };

function getNodePalette(defaultPalette: PaletteEntry, data: NodeProps["data"]): PaletteEntry {
  const colorId = data.colorPreset as string | undefined;
  if (!colorId) return defaultPalette;
  return COLOR_PRESETS.find((c) => c.id === colorId) ?? defaultPalette;
}

function ColorToolbar({ nodeId, data }: { nodeId: string; data: NodeProps["data"] }) {
  const { setNodes, getEdges } = useReactFlow();
  const notifyChange = useContext(DiagramChangeCtx);
  const active = data.colorPreset as string | undefined;

  function applyColor(id: string | null) {
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, colorPreset: id ?? undefined } } : n
      );
      notifyChange(updated, getEdges());
      return updated;
    });
  }

  return (
    <NodeToolbar isVisible position={Position.Top}>
      <div className="flex items-center gap-1 bg-white border border-black/10 rounded-xl px-2 py-1.5 shadow-lg">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c.id}
            onClick={() => applyColor(c.id)}
            title={c.id}
            style={{ background: c.dot, width: 14, height: 14, borderRadius: "50%", border: active === c.id ? "2px solid #000" : "2px solid transparent", outline: active === c.id ? "2px solid " + c.dot : "none", outlineOffset: 1, transition: "transform 0.1s" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
        ))}
        {active && (
          <button
            onClick={() => applyColor(null)}
            title="Reset color"
            className="ml-1 text-[10px] text-black/30 hover:text-black/70 transition-colors leading-none"
          >
            ✕
          </button>
        )}
      </div>
    </NodeToolbar>
  );
}

// Handles must live on the outermost node element so React Flow positions them correctly
function Handles() {
  return (
    <>
      <Handle type="source" position={Position.Top}    id="top"    />
      <Handle type="target" position={Position.Top}    id="top-t"  style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="target" position={Position.Bottom} id="bottom-t" style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" position={Position.Left}   id="left"   />
      <Handle type="target" position={Position.Left}   id="left-t"  style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" position={Position.Right}  id="right"  />
      <Handle type="target" position={Position.Right}  id="right-t" style={{ opacity: 0, pointerEvents: "none" }} />
    </>
  );
}

function makeNode(palette: keyof typeof PALETTES, shape: "rect" | "diamond" | "circle" = "rect") {
  return function NodeComponent({ id, data, selected }: NodeProps) {
    const { editing, setEditing, label, setLabel, inputRef } = useEditableLabel(data.label as string);
    const p = getNodePalette(PALETTES[palette], data);
    const labelEl = editing
      ? <LabelInput label={label} setLabel={setLabel} setEditing={setEditing} inputRef={inputRef} data={data} color="" />
      : <span style={{ fontSize: 12, fontWeight: 600, color: p.text, textAlign: "center", display: "block", lineHeight: 1.3 }}>{label}</span>;

    const borderStyle = `1.5px solid ${selected ? p.selectedBorder : p.border}`;
    const shadow = selected ? `0 0 0 3px ${p.bg}` : undefined;

    if (shape === "circle") {
      return (
        <div
          onDoubleClick={() => setEditing(true)}
          style={{ position: "relative", width: 90, height: 90, borderRadius: "50%", background: p.bg, border: borderStyle, boxShadow: shadow, display: "flex", alignItems: "center", justifyContent: "center", cursor: "default" }}
        >
          {selected && <ColorToolbar nodeId={id} data={data} />}
          <Handles />
          {labelEl}
        </div>
      );
    }

    if (shape === "diamond") {
      return (
        <div
          onDoubleClick={() => setEditing(true)}
          style={{ position: "relative", width: 130, height: 90, display: "flex", alignItems: "center", justifyContent: "center", cursor: "default" }}
        >
          {selected && <ColorToolbar nodeId={id} data={data} />}
          <Handles />
          <div style={{ position: "absolute", inset: 12, transform: "rotate(45deg)", borderRadius: 6, background: p.bg, border: borderStyle, boxShadow: shadow }} />
          <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 8px" }}>{labelEl}</div>
        </div>
      );
    }

    // rect (default)
    return (
      <div
        onDoubleClick={() => setEditing(true)}
        style={{ position: "relative", minWidth: 130, padding: "10px 20px", borderRadius: 12, background: p.bg, border: borderStyle, boxShadow: shadow, cursor: "default" }}
      >
        {selected && <ColorToolbar nodeId={id} data={data} />}
        <Handles />
        {labelEl}
      </div>
    );
  };
}

const RectNode       = makeNode("process");
const DiamondNode    = makeNode("decision", "diamond");
const CircleNode     = makeNode("terminal", "circle");
const ToolNode       = makeNode("tool");
const ClassifierNode = makeNode("classifier");

// ── Database — cylinder shape ─────────────────────────────────────────────
function DatabaseNode({ id, data, selected }: NodeProps) {
  const { editing, setEditing, label, setLabel, inputRef } = useEditableLabel(data.label as string);
  const p = getNodePalette(PALETTES.database, data);
  const W = 130, H = 80, RY = 11;
  const border = selected ? p.selectedBorder : p.border;
  return (
    <div onDoubleClick={() => setEditing(true)} style={{ position: "relative", width: W, height: H, cursor: "default" }}>
      {selected && <ColorToolbar nodeId={id} data={data} />}
      <Handles />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {/* body */}
        <rect x={1} y={RY} width={W - 2} height={H - RY * 2} fill={p.bg} stroke={border} strokeWidth={1.5} />
        {/* bottom cap */}
        <ellipse cx={W / 2} cy={H - RY} rx={(W - 2) / 2} ry={RY} fill={p.bg} stroke={border} strokeWidth={1.5} />
        {/* top cap — drawn last so it covers the rect top edge */}
        <ellipse cx={W / 2} cy={RY} rx={(W - 2) / 2} ry={RY} fill={p.bg} stroke={border} strokeWidth={1.5} />
        {/* top cap inner line for depth */}
        <ellipse cx={W / 2} cy={RY} rx={(W - 2) / 2} ry={RY} fill="none" stroke={border} strokeWidth={1} strokeDasharray="none" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: RY }}>
        {editing
          ? <LabelInput label={label} setLabel={setLabel} setEditing={setEditing} inputRef={inputRef} data={data} color="" />
          : <span style={{ fontSize: 12, fontWeight: 600, color: p.text, textAlign: "center" }}>{label}</span>}
      </div>
    </div>
  );
}

// ── Document — rectangle with curled bottom ───────────────────────────────
function DocumentNode({ id, data, selected }: NodeProps) {
  const { editing, setEditing, label, setLabel, inputRef } = useEditableLabel(data.label as string);
  const p = getNodePalette(PALETTES.document, data);
  const W = 130, H = 75;
  const border = selected ? p.selectedBorder : p.border;
  // wavy bottom path
  const wave = `M1,${H - 14} Q${W * 0.25},${H} ${W * 0.5},${H - 10} Q${W * 0.75},${H - 20} ${W - 1},${H - 10} L${W - 1},1 L1,1 Z`;
  return (
    <div onDoubleClick={() => setEditing(true)} style={{ position: "relative", width: W, height: H, cursor: "default" }}>
      {selected && <ColorToolbar nodeId={id} data={data} />}
      <Handles />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={wave} fill={p.bg} stroke={border} strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 10 }}>
        {editing
          ? <LabelInput label={label} setLabel={setLabel} setEditing={setEditing} inputRef={inputRef} data={data} color="" />
          : <span style={{ fontSize: 12, fontWeight: 600, color: p.text, textAlign: "center" }}>{label}</span>}
      </div>
    </div>
  );
}

// ── I/O — parallelogram ───────────────────────────────────────────────────
function IONode({ id, data, selected }: NodeProps) {
  const { editing, setEditing, label, setLabel, inputRef } = useEditableLabel(data.label as string);
  const p = getNodePalette(PALETTES.io, data);
  const border = selected ? p.selectedBorder : p.border;
  const shadow = selected ? `0 0 0 3px ${p.bg}` : undefined;
  return (
    <div
      onDoubleClick={() => setEditing(true)}
      style={{
        position: "relative", minWidth: 130, padding: "10px 28px 10px 20px",
        background: p.bg, border: `1.5px solid ${border}`, boxShadow: shadow,
        cursor: "default",
        clipPath: "polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)",
      }}
    >
      {selected && <ColorToolbar nodeId={id} data={data} />}
      <Handles />
      {editing
        ? <LabelInput label={label} setLabel={setLabel} setEditing={setEditing} inputRef={inputRef} data={data} color="" />
        : <span style={{ fontSize: 12, fontWeight: 600, color: p.text, textAlign: "center", display: "block" }}>{label}</span>}
    </div>
  );
}

// ── Cloud ─────────────────────────────────────────────────────────────────
function CloudNode({ id, data, selected }: NodeProps) {
  const { editing, setEditing, label, setLabel, inputRef } = useEditableLabel(data.label as string);
  const p = getNodePalette(PALETTES.cloud, data);
  const W = 130, H = 72;
  const bc = selected ? p.selectedBorder : p.border;
  // Three-bump cloud built from overlapping circles + filled base
  return (
    <div onDoubleClick={() => setEditing(true)} style={{ position: "relative", width: W, height: H, cursor: "default" }}>
      {selected && <ColorToolbar nodeId={id} data={data} />}
      <Handles />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {/* fill base rect so circles merge visually */}
        <rect x={10} y={42} width={110} height={24} fill={p.bg} stroke="none" />
        <circle cx={32} cy={48} r={22} fill={p.bg} stroke={bc} strokeWidth={1.5} />
        <circle cx={57} cy={36} r={26} fill={p.bg} stroke={bc} strokeWidth={1.5} />
        <circle cx={84} cy={40} r={22} fill={p.bg} stroke={bc} strokeWidth={1.5} />
        <circle cx={104} cy={50} r={18} fill={p.bg} stroke={bc} strokeWidth={1.5} />
        {/* cover inner strokes at bottom */}
        <rect x={12} y={50} width={106} height={18} fill={p.bg} stroke="none" />
        <line x1={12} y1={68} x2={118} y2={68} stroke={bc} strokeWidth={1.5} />
        <path d="M12,68 A22,22 0 0,1 10,50" fill="none" stroke={bc} strokeWidth={1.5} />
        <path d="M118,50 A18,18 0 0,1 118,68" fill="none" stroke={bc} strokeWidth={1.5} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 12 }}>
        {editing
          ? <LabelInput label={label} setLabel={setLabel} setEditing={setEditing} inputRef={inputRef} data={data} color="" />
          : <span style={{ fontSize: 12, fontWeight: 600, color: p.text, textAlign: "center" }}>{label}</span>}
      </div>
    </div>
  );
}

// ── Queue — horizontal cylinder/pipe ─────────────────────────────────────
function QueueNode({ id, data, selected }: NodeProps) {
  const { editing, setEditing, label, setLabel, inputRef } = useEditableLabel(data.label as string);
  const p = getNodePalette(PALETTES.queue, data);
  const W = 140, H = 58, RX = 16;
  const bc = selected ? p.selectedBorder : p.border;
  return (
    <div onDoubleClick={() => setEditing(true)} style={{ position: "relative", width: W, height: H, cursor: "default" }}>
      {selected && <ColorToolbar nodeId={id} data={data} />}
      <Handles />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {/* body */}
        <rect x={RX} y={4} width={W - RX * 2} height={H - 8} fill={p.bg} stroke="none" />
        <line x1={RX} y1={4} x2={W - RX} y2={4} stroke={bc} strokeWidth={1.5} />
        <line x1={RX} y1={H - 4} x2={W - RX} y2={H - 4} stroke={bc} strokeWidth={1.5} />
        {/* right cap — dashed to suggest depth */}
        <ellipse cx={W - RX} cy={H / 2} rx={RX} ry={H / 2 - 4} fill={p.bg} stroke={bc} strokeWidth={1} strokeDasharray="3 2" />
        {/* left cap — solid opening */}
        <ellipse cx={RX} cy={H / 2} rx={RX} ry={H / 2 - 4} fill={p.bg} stroke={bc} strokeWidth={1.5} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {editing
          ? <LabelInput label={label} setLabel={setLabel} setEditing={setEditing} inputRef={inputRef} data={data} color="" />
          : <span style={{ fontSize: 12, fontWeight: 600, color: p.text, textAlign: "center" }}>{label}</span>}
      </div>
    </div>
  );
}

// ── Actor — person icon ───────────────────────────────────────────────────
function ActorNode({ id, data, selected }: NodeProps) {
  const { editing, setEditing, label, setLabel, inputRef } = useEditableLabel(data.label as string);
  const p = getNodePalette(PALETTES.actor, data);
  const W = 70, H = 90;
  const bc = selected ? p.selectedBorder : p.border;
  return (
    <div onDoubleClick={() => setEditing(true)} style={{ position: "relative", width: W, height: H, cursor: "default" }}>
      {selected && <ColorToolbar nodeId={id} data={data} />}
      <Handles />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {/* head */}
        <circle cx={35} cy={18} r={13} fill={p.bg} stroke={bc} strokeWidth={1.5} />
        {/* body */}
        <path d="M12,75 Q12,48 35,45 Q58,48 58,75 Z" fill={p.bg} stroke={bc} strokeWidth={1.5} strokeLinejoin="round" />
        <line x1={12} y1={75} x2={58} y2={75} stroke={bc} strokeWidth={1.5} />
      </svg>
      <div style={{ position: "absolute", bottom: 2, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {editing
          ? <LabelInput label={label} setLabel={setLabel} setEditing={setEditing} inputRef={inputRef} data={data} color="" />
          : <span style={{ fontSize: 11, fontWeight: 600, color: p.text, textAlign: "center" }}>{label}</span>}
      </div>
    </div>
  );
}

// ── Hexagon — preparation / API ───────────────────────────────────────────
function HexagonNode({ id, data, selected }: NodeProps) {
  const { editing, setEditing, label, setLabel, inputRef } = useEditableLabel(data.label as string);
  const p = getNodePalette(PALETTES.hexagon, data);
  const border = selected ? p.selectedBorder : p.border;
  const shadow = selected ? `0 0 0 3px ${p.bg}` : undefined;
  return (
    <div
      onDoubleClick={() => setEditing(true)}
      style={{
        position: "relative", width: 130, height: 60,
        background: p.bg, border: `1.5px solid ${border}`, boxShadow: shadow,
        clipPath: "polygon(14% 0%, 86% 0%, 100% 50%, 86% 100%, 14% 100%, 0% 50%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "default",
      }}
    >
      {selected && <ColorToolbar nodeId={id} data={data} />}
      <Handles />
      {editing
        ? <LabelInput label={label} setLabel={setLabel} setEditing={setEditing} inputRef={inputRef} data={data} color="" />
        : <span style={{ fontSize: 12, fontWeight: 600, color: p.text, textAlign: "center", padding: "0 20px" }}>{label}</span>}
    </div>
  );
}

// ── Stadium / Pill — alternate start/end ─────────────────────────────────
function StadiumNode({ id, data, selected }: NodeProps) {
  const { editing, setEditing, label, setLabel, inputRef } = useEditableLabel(data.label as string);
  const p = getNodePalette(PALETTES.stadium, data);
  const border = selected ? p.selectedBorder : p.border;
  const shadow = selected ? `0 0 0 3px ${p.bg}` : undefined;
  return (
    <div
      onDoubleClick={() => setEditing(true)}
      style={{
        position: "relative", minWidth: 130, padding: "10px 24px",
        background: p.bg, border: `1.5px solid ${border}`, boxShadow: shadow,
        borderRadius: 100, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "default",
      }}
    >
      {selected && <ColorToolbar nodeId={id} data={data} />}
      <Handles />
      {editing
        ? <LabelInput label={label} setLabel={setLabel} setEditing={setEditing} inputRef={inputRef} data={data} color="" />
        : <span style={{ fontSize: 12, fontWeight: 600, color: p.text, textAlign: "center" }}>{label}</span>}
    </div>
  );
}

// ── Note — folded corner ──────────────────────────────────────────────────
function NoteNode({ id, data, selected }: NodeProps) {
  const { editing, setEditing, label, setLabel, inputRef } = useEditableLabel(data.label as string);
  const p = getNodePalette(PALETTES.note, data);
  const W = 130, H = 75, FOLD = 18;
  const bc = selected ? p.selectedBorder : p.border;
  return (
    <div onDoubleClick={() => setEditing(true)} style={{ position: "relative", width: W, height: H, cursor: "default" }}>
      {selected && <ColorToolbar nodeId={id} data={data} />}
      <Handles />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={`M1,1 L${W - FOLD},1 L${W - 1},${FOLD} L${W - 1},${H - 1} L1,${H - 1} Z`}
          fill={p.bg} stroke={bc} strokeWidth={1.5} strokeLinejoin="round" />
        {/* fold crease */}
        <path d={`M${W - FOLD},1 L${W - FOLD},${FOLD} L${W - 1},${FOLD}`}
          fill="none" stroke={bc} strokeWidth={1} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px" }}>
        {editing
          ? <LabelInput label={label} setLabel={setLabel} setEditing={setEditing} inputRef={inputRef} data={data} color="" />
          : <span style={{ fontSize: 12, fontWeight: 600, color: p.text, textAlign: "center" }}>{label}</span>}
      </div>
    </div>
  );
}

// ── Trapezoid — manual operation ─────────────────────────────────────────
function TrapezoidNode({ id, data, selected }: NodeProps) {
  const { editing, setEditing, label, setLabel, inputRef } = useEditableLabel(data.label as string);
  const p = getNodePalette(PALETTES.trapezoid, data);
  const border = selected ? p.selectedBorder : p.border;
  const shadow = selected ? `0 0 0 3px ${p.bg}` : undefined;
  return (
    <div
      onDoubleClick={() => setEditing(true)}
      style={{
        position: "relative", minWidth: 130, padding: "10px 24px",
        background: p.bg, border: `1.5px solid ${border}`, boxShadow: shadow,
        clipPath: "polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "default",
      }}
    >
      {selected && <ColorToolbar nodeId={id} data={data} />}
      <Handles />
      {editing
        ? <LabelInput label={label} setLabel={setLabel} setEditing={setEditing} inputRef={inputRef} data={data} color="" />
        : <span style={{ fontSize: 12, fontWeight: 600, color: p.text, textAlign: "center" }}>{label}</span>}
    </div>
  );
}

const nodeTypes = {
  default: RectNode,
  rectangle: RectNode,
  diamond: DiamondNode,
  circle: CircleNode,
  tool: ToolNode,
  classifier: ClassifierNode,
  database:  DatabaseNode,
  document:  DocumentNode,
  io:        IONode,
  cloud:     CloudNode,
  queue:     QueueNode,
  actor:     ActorNode,
  hexagon:   HexagonNode,
  stadium:   StadiumNode,
  note:      NoteNode,
  trapezoid: TrapezoidNode,
};

// ── Left icon strip ───────────────────────────────────────────────────────

function ShapePreview({ type }: { type: string }) {
  const s = "currentColor";
  const sw = 1.5;
  switch (type) {
    case "rectangle":  return <svg width={22} height={14} viewBox="0 0 22 14"><rect x={1} y={1} width={20} height={12} rx={3} fill="none" stroke={s} strokeWidth={sw}/></svg>;
    case "diamond":    return <svg width={18} height={14} viewBox="0 0 18 14"><polygon points="9,1 17,7 9,13 1,7" fill="none" stroke={s} strokeWidth={sw}/></svg>;
    case "circle":     return <svg width={14} height={14} viewBox="0 0 14 14"><circle cx={7} cy={7} r={6} fill="none" stroke={s} strokeWidth={sw}/></svg>;
    case "stadium":    return <svg width={22} height={12} viewBox="0 0 22 12"><rect x={1} y={1} width={20} height={10} rx={5} fill="none" stroke={s} strokeWidth={sw}/></svg>;
    case "tool":       return <svg width={22} height={14} viewBox="0 0 22 14"><rect x={1} y={1} width={20} height={12} rx={3} fill="none" stroke={s} strokeWidth={sw}/><line x1={1} y1={5} x2={21} y2={5} stroke={s} strokeWidth={sw}/></svg>;
    case "classifier": return <svg width={22} height={14} viewBox="0 0 22 14"><rect x={1} y={1} width={20} height={12} rx={3} fill="none" stroke={s} strokeWidth={sw}/><line x1={7} y1={1} x2={7} y2={13} stroke={s} strokeWidth={sw}/></svg>;
    case "database":   return <svg width={16} height={16} viewBox="0 0 16 16"><rect x={1} y={4} width={14} height={9} fill="none" stroke={s} strokeWidth={sw}/><ellipse cx={8} cy={4} rx={7} ry={3} fill="none" stroke={s} strokeWidth={sw}/></svg>;
    case "queue":      return <svg width={22} height={14} viewBox="0 0 22 14"><rect x={5} y={1} width={16} height={12} fill="none" stroke={s} strokeWidth={sw}/><ellipse cx={5} cy={7} rx={4} ry={6} fill="none" stroke={s} strokeWidth={sw}/></svg>;
    case "cloud":      return <svg width={22} height={14} viewBox="0 0 22 14"><circle cx={6} cy={9} r={4} fill="none" stroke={s} strokeWidth={sw}/><circle cx={11} cy={6} r={5} fill="none" stroke={s} strokeWidth={sw}/><circle cx={17} cy={8} r={4} fill="none" stroke={s} strokeWidth={sw}/><line x1={2} y1={13} x2={21} y2={13} stroke={s} strokeWidth={sw}/></svg>;
    case "document":   return <svg width={16} height={16} viewBox="0 0 16 16"><path d="M1,1 L15,1 L15,11 Q12,14 8,12 Q4,10 1,13 Z" fill="none" stroke={s} strokeWidth={sw}/></svg>;
    case "io":         return <svg width={22} height={12} viewBox="0 0 22 12"><polygon points="3,1 21,1 19,11 1,11" fill="none" stroke={s} strokeWidth={sw}/></svg>;
    case "hexagon":    return <svg width={20} height={14} viewBox="0 0 20 14"><polygon points="5,1 15,1 19,7 15,13 5,13 1,7" fill="none" stroke={s} strokeWidth={sw}/></svg>;
    case "note":       return <svg width={18} height={16} viewBox="0 0 18 16"><path d="M1,1 L13,1 L17,5 L17,15 L1,15 Z" fill="none" stroke={s} strokeWidth={sw}/><path d="M13,1 L13,5 L17,5" fill="none" stroke={s} strokeWidth={sw}/></svg>;
    case "trapezoid":  return <svg width={22} height={12} viewBox="0 0 22 12"><polygon points="4,1 18,1 21,11 1,11" fill="none" stroke={s} strokeWidth={sw}/></svg>;
    case "actor":      return <svg width={14} height={18} viewBox="0 0 14 18"><circle cx={7} cy={4} r={3.5} fill="none" stroke={s} strokeWidth={sw}/><path d="M1,17 Q1,10 7,9 Q13,10 13,17" fill="none" stroke={s} strokeWidth={sw}/></svg>;
    default:           return <svg width={18} height={14} viewBox="0 0 18 14"><rect x={1} y={1} width={16} height={12} rx={3} fill="none" stroke={s} strokeWidth={sw}/></svg>;
  }
}

const SHAPES: { type: string; label: string }[] = [
  { type: "rectangle",  label: "Process"    },
  { type: "diamond",    label: "Decision"   },
  { type: "circle",     label: "Terminal"   },
  { type: "stadium",    label: "Start / End"},
  { type: "tool",       label: "Tool"       },
  { type: "classifier", label: "Classifier" },
  { type: "database",   label: "Database"   },
  { type: "queue",      label: "Queue"      },
  { type: "cloud",      label: "Cloud"      },
  { type: "document",   label: "Document"   },
  { type: "io",         label: "I / O"      },
  { type: "hexagon",    label: "Prepare"    },
  { type: "note",       label: "Note"       },
  { type: "trapezoid",  label: "Manual"     },
  { type: "actor",      label: "Actor"      },
];

function ShapeToolbar({ onAdd }: { onAdd: (type: string) => void }) {
  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white border border-black/10 rounded-2xl shadow-sm py-2 px-1.5 flex flex-col gap-0.5">
      {SHAPES.map((s) => (
        <div key={s.type} className="relative group">
          <button
            onClick={() => onAdd(s.type)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ShapePreview type={s.type} />
          </button>
          {/* Tooltip */}
          <div className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Export controls ───────────────────────────────────────────────────────
function ExportControls({ diagramState, canvasRef }: { diagramState: DiagramState | null; canvasRef: React.RefObject<HTMLDivElement | null> }) {
  const [open, setOpen] = useState(false);

  function downloadJSON() {
    if (!diagramState) return;
    const blob = new Blob([JSON.stringify(diagramState, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "diagram.json"; a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  async function downloadPNG() {
    const el = canvasRef.current?.querySelector(".react-flow__renderer") as HTMLElement | null;
    if (!el) return;

    // html-to-image wraps HTML in a foreignObject SVG, breaking url(#marker-id) references.
    // Fix: inline each referenced marker as a self-contained SVG data URI before capture.
    const edgesSvg = el.querySelector("svg");
    const defsEl = edgesSvg?.querySelector("defs");
    const markerPaths = edgesSvg ? [...edgesSvg.querySelectorAll<Element>("[marker-end]")] : [];
    const saved: { el: Element; value: string }[] = [];

    if (defsEl && markerPaths.length) {
      const serializer = new XMLSerializer();
      markerPaths.forEach((path) => {
        const raw = path.getAttribute("marker-end") ?? "";
        const match = raw.match(/url\(["']?#(.+?)["']?\)/);
        if (!match) return;
        const marker = defsEl.querySelector(`#${CSS.escape(match[1])}`);
        if (!marker) return;
        saved.push({ el: path, value: raw });
        const svgWrap = `<svg xmlns="http://www.w3.org/2000/svg"><defs>${serializer.serializeToString(marker)}</defs></svg>`;
        const uri = `url("data:image/svg+xml,${encodeURIComponent(svgWrap)}#${match[1]}")`;
        path.setAttribute("marker-end", uri);
      });
    }

    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "#f8fafc",
        pixelRatio: 2,
        filter: (node) => !(node instanceof Element && node.classList.contains("react-flow__handle")),
      });
      const a = document.createElement("a"); a.href = dataUrl; a.download = "diagram.png"; a.click();
    } finally {
      saved.forEach(({ el: path, value }) => path.setAttribute("marker-end", value));
    }
    setOpen(false);
  }

  return (
    <Panel position="bottom-right">
      <div className="flex flex-col items-end gap-1">
        {open && (
          <div className="bg-white border border-black/10 rounded-xl shadow-lg overflow-hidden mb-1">
            <button onClick={downloadJSON} className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-black/70 hover:bg-black/5 transition-colors whitespace-nowrap">
              <span className="font-mono text-[10px] text-black/30">{"{}"}</span> Export JSON
            </button>
            <button onClick={downloadPNG} disabled={!diagramState} className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-black/70 hover:bg-black/5 disabled:opacity-40 transition-colors border-t border-black/8 whitespace-nowrap">
              <span className="font-mono text-[10px] text-black/30">⬜</span> Export PNG
            </button>
          </div>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={!diagramState}
          className="bg-white border border-black/10 shadow-sm text-black/50 hover:text-black hover:border-black/30 disabled:opacity-30 rounded-xl px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <svg width={12} height={12} viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/></svg>
          Export
        </button>
      </div>
    </Panel>
  );
}

// ── Main canvas ───────────────────────────────────────────────────────────
interface Props {
  diagramState: DiagramState | null;
  onDiagramChange: (state: DiagramState) => void;
}

export default function DiagramCanvas({ diagramState, onDiagramChange }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(diagramState?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(diagramState?.edges ?? []);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNodes(diagramState?.nodes ?? []);
    setEdges(diagramState?.edges ?? []);
  }, [diagramState, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifyChange = useCallback(
    (updatedNodes: Node[], updatedEdges: Edge[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onDiagramChange({ nodes: updatedNodes, edges: updatedEdges });
      }, 600);
    },
    [onDiagramChange]
  );

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      setNodes((nds) => { notifyChange(nds, edges); return nds; });
    },
    [onNodesChange, setNodes, edges, notifyChange]
  );

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      setEdges((eds) => { notifyChange(nodes, eds); return eds; });
    },
    [onEdgesChange, setEdges, nodes, notifyChange]
  );

  function addShape(type: string) {
    const labels: Record<string, string> = { rectangle: "Process", diamond: "Decision", circle: "Terminal" };
    const id = crypto.randomUUID();
    const offset = (nodes.length % 8) * 30;
    const newNode: Node = {
      id,
      type,
      position: { x: 200 + offset, y: 200 + offset },
      data: { label: labels[type] ?? type },
    };
    setNodes((nds) => {
      const updated = [...nds, newNode];
      notifyChange(updated, edges);
      return updated;
    });
  }

  return (
    <div className="flex-1 h-full relative" ref={canvasRef}>
      <ShapeToolbar onAdd={addShape} />
      <DiagramChangeCtx.Provider value={notifyChange}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          style={{ background: "#f8fafc" }}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
          <ExportControls diagramState={diagramState} canvasRef={canvasRef} />
        </ReactFlow>
      </DiagramChangeCtx.Provider>
    </div>
  );
}
