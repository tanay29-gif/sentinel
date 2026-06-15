import {NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const payload = await request.json();
    console.log("Received GitHub webhook payload:", payload);

    // You can add more validation here to ensure the payload is from GitHub
    if (!payload || !payload.repository || !payload.head_commit) {
      console.warn("Invalid payload structure");
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }
} catch (error) {
    console.error("Error processing GitHub webhook:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}