import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Incident {
  id: string;
  team_id: string;
  service_id: string | null;
  title: string;
  severity: string;
  status: string;
  summary: string;
  root_cause_suggestion: string;
  created_at: string;
  resolved_at: string | null;
  ai_summary: string | null;
  source: string;
  ai_metadata: Record<string, any> | null;
  services: {
    name: string;
  } | null;
}

interface IncidentEvent {
  id: string;
  incident_id: string;
  source: string;
  event: string;
  provenance: Record<string, any>;
  created_at: string;
}

interface IncidentMessage {
  id: string;
  message: string;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  try {
    const supabase = await createClient();
    const { incidentId } = await params;
    const teamId = request.nextUrl.searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
    }

    // Verify user is member of team
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    // Fetch incident with service
    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .select(`
id,
team_id,
title,
severity,
status,
summary,
root_cause_suggestion,
created_at,
resolved_at,
ai_summary,
ai_metadata,
source,
services(name)
`)

      .eq("id", incidentId)
      .eq("team_id", teamId)
      .single()
      .returns<Incident>();

    if (incidentError || !incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // Fetch incident events
    const { data: events, error: eventsError } = await supabase
      .from("incident_events")
      .select("id, incident_id, source, event, provenance, created_at")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: true })
      .returns<IncidentEvent[]>();

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }

   const workflowEvent = events?.find(
  (e) =>
    e.source === "github" &&
    e.provenance
);

const githubUrl =
  workflowEvent?.provenance?.htmlUrl ??
  workflowEvent?.provenance?.logUrl ??
  null;

const logPath =
  workflowEvent?.provenance?.logPath ??
  null;
  
    // Fetch incident channel
    const { data: channel, error: channelError } = await supabase
      .from("incident_channels")
      .select("id")
      .eq("incident_id", incidentId)
      .single();

    let messages: IncidentMessage[] = [];

    // Fetch incident messages if channel exists
    if (channel && channel.id) {
      const { data: channelMessages, error: messagesError } = await supabase
        .from("incident_messages")
        .select(
          `
          id,
          message,
          created_at,
          profiles(full_name)
        `
        )
        .eq("channel_id", channel.id)
        .order("created_at", { ascending: true })
        .returns<IncidentMessage[]>();

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
      } else {
        messages = channelMessages || [];
      }
    }

    return NextResponse.json({
      incident,
      events: events || [],
      messages,
      githubUrl,
      logPath,
      userRole: membership.role

    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
