export async function getGrafanaMetrics(
    services: string[],
    mode: "live" | "range"
) {

    const GRAFANA_URL = process.env.NEXT_GRAFANA_METRICS_URL!;
    const USER = process.env.NEXT_GRAFANA_METRICS_USER!;
    const TOKEN = process.env.NEXT_GRAFANA_API_KEY!;

    const authHeader =
        `Basic ${Buffer.from(`${USER}:${TOKEN}`).toString("base64")}`;

    const end = Math.floor(Date.now() / 1000);

    const start =
        mode === "live"
            ? end - 5 * 60
            : end - 14 * 24 * 60 * 60;

    const rateWindow =
        mode === "live"
            ? "2m"
            : "5m";

    let matcher = "";

    if (services.length > 0) {

        if (services.length === 1) {

            matcher = `service_name="${services[0]}"`;

        } else {

            matcher =
                `service_name=~"${services.join("|")}"`;

        }

    }

    const selector =
        matcher
            ? `{${matcher}}`
            : "{}";

    const queries = {

        latency: `
histogram_quantile(
0.95,
sum(
rate(http_server_request_duration_seconds_bucket${selector}[${rateWindow}])
)
by(le,service_name)
)`,

        requestRate: `
sum(
rate(http_server_request_duration_seconds_count${selector}[${rateWindow}])
)
by(service_name)
`,

        errorRate: `
100 *
(
sum(
rate(http_server_request_duration_seconds_count{
http_response_status_code=~"5.."
${matcher ? "," + matcher : ""}
}[${rateWindow}])
)
/
clamp_min(
sum(
rate(http_server_request_duration_seconds_count${selector}[${rateWindow}])
),
1
)
)
`

    };

    async function query(query: string) {

        const endpoint =
            mode === "live"
                ? "/api/v1/query"
                : "/api/v1/query_range";

        const url =
            new URL(`${GRAFANA_URL}${endpoint}`);

        url.searchParams.append("query", query);

        if (mode === "range") {

            url.searchParams.append("start", start.toString());

            url.searchParams.append("end", end.toString());

            url.searchParams.append("step", "1h");

        }

        const res = await fetch(url, {

            headers: {

                Authorization: authHeader,

                Accept: "application/json"

            },

            cache: "no-store"

        });

        return res.json();

    }

    const [latency, errorRate, requestRate] =
        await Promise.all([

            query(queries.latency),

            query(queries.errorRate),

            query(queries.requestRate)

        ]);

    return {

        latency,

        errorRate,

        requestRate

    };

}