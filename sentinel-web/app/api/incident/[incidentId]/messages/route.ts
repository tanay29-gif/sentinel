import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  try {
    const supabase = await createClient();
    const { incidentId } = await params;
    const { message, teamId } = await request.json();

    if (!message?.trim() || !teamId) {
      return NextResponse.json({ error: "Missing message or teamId" }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is member of team
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (
      !membership ||
      (membership.role !== "owner" &&
        membership.role !== "engineer")
    ) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Verify incident belongs to team
    const { data: incident } = await supabase
      .from("incidents")
      .select("id")
      .eq("id", incidentId)
      .eq("team_id", teamId)
      .single();

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // Get or create incident channel
    let { data: channel, error: channelError } = await supabase
      .from("incident_channels")
      .select("id")
      .eq("incident_id", incidentId)
      .single();

    if (!channel) {
      // Create channel if it doesn't exist
      const { data: newChannel, error: channelError } =
        await supabase
          .from("incident_channels")
          .upsert(
            {
              incident_id: incidentId,
            },
            {
              onConflict: "incident_id",
            })
          .select("id")
          .single();

      if (channelError || !newChannel) {
        return NextResponse.json(
          { error: "Failed to create channel" },
          { status: 500 }
        );
      }

      channel = newChannel;
    }

    if (!channel) {
      return NextResponse.json(
        { error: "Failed to access incident channel" },
        { status: 500 }
      );
    }

const { data: inserted, error: messageError } =
await supabase
.from("incident_messages")
.insert({
    channel_id: channel.id,
    sender_id: user.id,
    message: message.trim(),
})
.select("id")
.single();

if (messageError || !inserted) {
    console.error(messageError);

    return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
    );
}

const { data: newMessage, error: fetchError } =
await supabase
.from("incident_messages")
.select(`
id,
message,
created_at,
profiles(
    full_name
)
`)
.eq("id", inserted.id)
.single();

if (fetchError || !newMessage) {
    console.error(fetchError);

    return NextResponse.json(
        { error: "Failed to fetch message" },
        { status: 500 }
    );
}

return NextResponse.json({
    message: newMessage,
});
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
