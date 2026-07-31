import { NextRequest, NextResponse } from "next/server";
import { getGrafanaMetrics } from "@/lib/grafana/grafana-client";

export async function GET(req: NextRequest) {

    const { searchParams } = new URL(req.url);

    const services =
        searchParams.get("services")
            ?.split(",")
            ?? [];

    const mode =
        (searchParams.get("mode") as
            "live" | "range") ??
        "range";

    const data =
        await getGrafanaMetrics(
            services,
            mode
        );

    return NextResponse.json(data);

}