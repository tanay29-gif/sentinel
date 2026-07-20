import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {

  try {

    const { searchParams } = new URL(request.url);
    const services = searchParams.get('services');
    const mode = searchParams.get('mode') || 'range';

    const GRAFANA_URL = process.env.NEXT_GRAFANA_URL!;
    const USER = process.env.NEXT_GRAFANA_USER!;
    const TOKEN = process.env.NEXT_GRAFANA_API_KEY!;

    console.log("GRAFANA_URL:", GRAFANA_URL);
    // console.log("TOKEN:", TOKEN);


    if (!GRAFANA_URL || !TOKEN) {
      console.error("CRITICAL: Missing Grafana Environment Variables");
      return NextResponse.json({ error: "Config missing" }, { status: 500 });
    }

    const authHeader = `Basic ${Buffer.from(`${USER}:${TOKEN}`).toString("base64")}`;
    const end = Math.floor(Date.now() / 1000);
    const start = mode === 'live' ? end - (5 * 60) : end - (14 * 24 * 60 * 60);

    // const serviceRegex = services ? services.split(',').join('|') : ".*";
    // const serviceFilter = `service_name=~"${serviceRegex}"`;
    let matcher = "";

    if (services) {

      const list = services
        .split(",")
        .map(s => s.trim());

      if (list.length === 1) {

        matcher = `service_name="${list[0]}"`;

      } else {

        const regex = list
          .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|");

        matcher = `service_name=~"${regex}"`;

      }

    }
    const requestSelector =
      matcher
        ? `{${matcher}}`
        : "{}";

    const errorSelector =
      matcher
        ? `{http_status_code=~"5..",${matcher}}`
        : `{http_status_code=~"5.."}`;

    // 3. PROPERLY QUOTED QUERIES
    const queries = {
      latency: `histogram_quantile(0.95, sum(rate(http_server_duration_milliseconds_bucket${requestSelector}[30m]))by(le, service_name))`,

      // Fixed Error Rate: added "or on() vector(0)" so empty results don't break the UI
      errorRate: `100 * (sum(rate(http_server_duration_milliseconds_count${errorSelector}[30m])) / clamp_min(sum(rate(http_server_duration_milliseconds_count${requestSelector}[30m])),1))`,

      requestRate: `sum(rate(http_server_duration_milliseconds_count${requestSelector}[30m])) by (service_name)`,
    };


    async function queryRange(query: string, queryName: string = "unknown") {

      console.log("Latency Query");
      console.log(queries.latency);

      // console.log("Error Query");
      // console.log(queries.errorRate);

      // console.log("Request Query");
      // console.log(queries.requestRate);

      const endpoint = mode === "live" ? "/api/v1/query" : "/api/v1/query_range";

      const url = new URL(`${GRAFANA_URL}${endpoint}`);
      url.searchParams.append("query", query);

      if (mode === "range") {
        url.searchParams.append("start", start.toString());
        url.searchParams.append("end", end.toString());
        url.searchParams.append("step", "1h");
      }

      console.log(url.toString());

      console.log(`[DEBUG] Querying ${queryName}...`);

      const response = await fetch(url, {
        headers: {
          "Authorization": authHeader,
          "Accept": "application/json"
        },
        cache: "no-store",
      });


      if (!response.ok) {
        const errorText = await response.text();
        console.error("GRAFANA API REJECTED REQUEST:", errorText); // THIS LOG IS KEY
        throw new Error(`Grafana Error: ${response.status} - ${errorText}`);
      }

      return response.json();
    }

    console.log("QUERIES:", queries);

    try {
      const [latency, errorRate, requestRate] = await Promise.all([
        queryRange(queries.latency, "latency"),
        queryRange(queries.errorRate, "errorRate"),
        queryRange(queries.requestRate, "requestRate"),
      ]);

      console.log("RAW LATENCY DATA:", JSON.stringify(latency.data.result, null, 2));
      console.log("RAW ERROR RATE DATA:", JSON.stringify(errorRate.data.result, null, 2));
      console.log("RAW REQUEST RATE DATA:", JSON.stringify(requestRate.data.result, null, 2));

      return NextResponse.json({ latency, errorRate, requestRate });
    } catch (error: any) {
      console.error("[DEBUG] FINAL API ERROR:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } catch (error: any) {
    // THIS WILL PRINT THE REAL ERROR TO YOUR TERMINAL
    console.error("API ROUTE CRASHED:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}