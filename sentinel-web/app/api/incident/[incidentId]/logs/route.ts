import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  const { incidentId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: event } = await supabaseAdmin
    .from("incident_events")
    .select("provenance")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const logPath = event?.provenance?.logPath;

  if (!logPath) {
    return NextResponse.json(
      { error: "Logs unavailable" },
      { status: 404 }
    );
  }

  const { data } = await supabaseAdmin.storage
    .from("sentinel_logs")
    .createSignedUrl(logPath, 60);

  return NextResponse.json({
    url: data?.signedUrl,
  });
}