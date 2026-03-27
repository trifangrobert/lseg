import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { diagram_state } = await request.json();
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("conversations")
    .update({ diagram_state, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
