import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const service = searchParams.get("service");
    const level = searchParams.get("level");

    if (!service) {
      return NextResponse.json(
        { error: "Missing service" },
        { status: 400 }
      );
    }

    const GRAFANA_URL = process.env.NEXT_GRAFANA_LOGS_URL!;
    const USER = process.env.NEXT_GRAFANA_LOGS_USER!;
    const TOKEN = process.env.NEXT_GRAFANA_API_KEY!;

    const auth = `Basic ${Buffer.from(
      `${USER}:${TOKEN}`
    ).toString("base64")}`;

    const end = Date.now() * 1_000_000;
    const start = end - 30 * 60 * 1_000_000_000;

    let query = `{service_name="${service}"}`;

    if (level) {
      query += ` |= "${level}"`;
    }

    const url = new URL(`${GRAFANA_URL.replace("/api/prom", "")}/loki/api/v1/query_range`);

    url.searchParams.set("query", query);
    url.searchParams.set("start", start.toString());
    url.searchParams.set("end", end.toString());
    url.searchParams.set("limit", "100");
    url.searchParams.set("direction", "BACKWARD");

    const response = await fetch(url, {
      headers: {
        Authorization: auth,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}