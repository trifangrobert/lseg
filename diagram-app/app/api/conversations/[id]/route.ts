import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const [convResult, msgResult] = await Promise.all([
    supabase.from("conversations").select("*").eq("id", id).single(),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (convResult.error)
    return NextResponse.json({ error: convResult.error.message }, { status: 404 });

  return NextResponse.json({
    conversation: convResult.data,
    messages: msgResult.data ?? [],
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
