import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const teamId = request.nextUrl.searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json(
        { error: "Missing teamId" },
        { status: 400 }
      );
    }

    // Current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Fetch incidents
    const { data: incidents, error } = await supabase
      .from("incidents")
      .select(`
        id,
        title,
        severity,
        status,
        summary,
        created_at,
        resolved_at,
        source,
        services (
          name
        )
      `)
      .eq("team_id", teamId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      return NextResponse.json(
        { error: "Failed to fetch incidents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      incidents: incidents ?? [],
      userRole: membership.role,
      userId: user.id,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}