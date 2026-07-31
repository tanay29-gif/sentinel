export type ServiceState =
  | "no-data"
  | "operational"
  | "warning"
  | "critical"
  | "offline";

export interface ServiceMetrics {
  uptimePercentage: number;
  dailyHistory: {
    timestamp: number;
    status: ServiceState;
  }[];
  lastLatency: number;
  lastErrorRate: string;
  requestRate: number;
  currentStatus: ServiceState;
}


// --- HELPERS ---
const THRESHOLDS = {
  latencyWarning: 500,
  latencyCritical: 1000,
  errorWarning: 1,
  errorCritical: 5,
};

function computeHealth(
  latency: number,
  errorRate: number
): ServiceState {

  if (
    latency >= THRESHOLDS.latencyCritical ||
    errorRate >= THRESHOLDS.errorCritical
  ) {
    return "critical";
  }

  if (
    latency >= THRESHOLDS.latencyWarning ||
    errorRate >= THRESHOLDS.errorWarning
  ) {
    return "warning";
  }

  return "operational";
}

function computeUptime(
  history: {
    status: ServiceState;
  }[]
) {

  if (history.length === 0) return 0;

  const healthy = history.filter(
    h => h.status === "operational"
  ).length;

  return Number(
    ((healthy / history.length) * 100).toFixed(2)
  );
}


export async function processGrafanaData(
  json: any,
  dbServices: string[]
): Promise<Record<string, ServiceMetrics>> {

  const serviceMetricsMap: Record<string, ServiceMetrics> = {};

  const now = Date.now();

  dbServices.forEach(serviceName => {

    const latRes =
      json.latency?.data?.result?.find(
        (r: any) =>
          r.metric.service_name === serviceName ||
          r.metric.job === serviceName
      );

    const errRes =
      json.errorRate?.data?.result?.find(
        (r: any) =>
          r.metric.service_name === serviceName ||
          r.metric.job === serviceName
      );

    const reqRes = json.requestRate?.data?.result?.find(
      (r: any) =>
        r.metric.service_name === serviceName ||
        r.metric.job === serviceName
    );

    const latencyRaw =
      latRes?.values ??
      (latRes?.value ? [latRes.value] : []);

    const errorRaw =
      errRes?.values ??
      (errRes?.value ? [errRes.value] : []);

    const requestRaw =
      reqRes?.values ??
      (reqRes?.value ? [reqRes.value] : []);

    /**
     * NO TELEMETRY EVER
     */
    const hasLatency = latencyRaw.length > 0;
    const hasRequestRate = requestRaw.length > 0;

    if (!hasLatency && !hasRequestRate) {

      serviceMetricsMap[serviceName] = {
        uptimePercentage: 0,
        dailyHistory: generateEmptyHistory(),
        lastLatency: 0,
        lastErrorRate: "0.00",
        requestRate: 0,
        currentStatus: "no-data"
      };

      return;
    }

    const points = [];

    for (let i = 0; i < latencyRaw.length; i++) {

      const timestamp = latencyRaw[i][0] * 1000;

      /**
       * Convert seconds -> milliseconds
       */
      const latency =
        parseFloat(latencyRaw[i][1]) * 1000;

      const errorRate =
        errorRaw.length > 0
          ? parseFloat(errorRaw[i]?.[1] ?? "0")
          : 0;

      const requestRate =
        requestRaw.length > 0
          ? parseFloat(requestRaw[i]?.[1] ?? requestRaw[0]?.[1] ?? "0")
          : 0;

      points.push({

        timestamp,

        latency,

        errorRate,
        requestRate,

        status: computeHealth(
          latency,
          errorRate
        )

      });

    }

    /**
     * OFFLINE DETECTION
     */

    let currentStatus: ServiceState =
      points[points.length - 1].status;

    const latest = points[points.length - 1];

    const lastSeen = latest.timestamp;

    const latestRequestRate = latest.requestRate;

    if (
      Date.now() - lastSeen > 5 * 60 * 1000 &&
      latestRequestRate === 0
    ) {
      currentStatus = "offline";
    }

    /**
     * CREATE 14 DAYS
     */

    const history = generateEmptyHistory();

    points.forEach(point => {

      const day =
        new Date(point.timestamp)
          .toISOString()
          .split("T")[0];

      const index =
        history.findIndex(h =>

          new Date(h.timestamp)
            .toISOString()
            .split("T")[0] === day

        );

      if (index === -1)
        return;

      const current =
        history[index].status;

      if (
        current === "critical" ||
        point.status === "critical"
      ) {

        history[index].status = "critical";

      }

      else if (
        current === "warning" ||
        point.status === "warning"
      ) {

        history[index].status = "warning";

      }

      else {

        history[index].status = "operational";

      }

    });


serviceMetricsMap[serviceName] = {

  uptimePercentage: computeUptime(history),

  dailyHistory: history,

  lastLatency: Math.round(latest.latency),

  lastErrorRate: latest.errorRate.toFixed(2),

  requestRate: Number(latest.requestRate.toFixed(2)),

  currentStatus

};

  });

  return serviceMetricsMap;

}

function generateEmptyHistory() {

  const history = [];

  for (let i = 13; i >= 0; i--) {

    const d = new Date();

    d.setDate(d.getDate() - i);

    history.push({

      timestamp: d.getTime(),

      status: "no-data" as ServiceState

    });

  }

  return history;

}


/**
 * Main function to be called from your page.tsx
 */
export async function fetchServiceMetrics(
    dbServices: string[],
    mode: "range" | "live" = "range"
) {

    try {

        const serviceParam = dbServices.join(",");

        let url = "";

        if (typeof window === "undefined") {

            // Running on server
            const base =
                process.env.NEXT_PUBLIC_APP_URL ??
                "http://localhost:3001";

            url =
                `${base}/api/grafana/metrics?services=${encodeURIComponent(serviceParam)}&mode=${mode}`;

        } else {

            // Running in browser
            url =
                `/api/grafana/metrics?services=${encodeURIComponent(serviceParam)}&mode=${mode}`;

        }

        const response = await fetch(url, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("API response not ok");
        }

        const json = await response.json();

        return processGrafanaData(json, dbServices);

    } catch (error) {

        console.error(`Failed to fetch ${mode} metrics:`, error);

        return {};

    }

}