import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
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

  const searchParams = request.nextUrl.searchParams;

  const teamId = searchParams.get("teamId");
  const membershipId = searchParams.get("membershipId");

  if (!teamId || !membershipId) {
    return NextResponse.json(
      {
        error: "Missing teamId or membershipId",
      },
      {
        status: 400,
      }
    );
  }

  const { role } = await request.json();

  const { data: me } = await supabase
    .from("memberships")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (me?.role !== "owner") {
    return NextResponse.json(
      {
        error: "Forbidden",
      },
      {
        status: 403,
      }
    );
  }

  const { error } = await supabase
    .from("memberships")
    .update({
      role,
    })
    .eq("id", membershipId);

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
  });
}