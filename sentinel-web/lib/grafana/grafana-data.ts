// --- HELPERS ---
const THRESHOLDS = {
  latencyWarning: 500,
  latencyCritical: 1000,
  errorWarning: 1,
  errorCritical: 5,
};

function computeHealth(latency: number, errorRate: number) {
  if (latency >= THRESHOLDS.latencyCritical || errorRate >= THRESHOLDS.errorCritical) return "critical";
  if (latency >= THRESHOLDS.latencyWarning || errorRate >= THRESHOLDS.errorWarning) return "warning";
  return "operational";
}

function computeUptime(latencyValues: number[], errorValues: number[]) {
  if (latencyValues.length === 0) return 100;
  let healthy = 0;
  for (let i = 0; i < latencyValues.length; i++) {
    if (computeHealth(latencyValues[i], errorValues[i]) === "operational") healthy++;
  }
  return Number(((healthy / latencyValues.length) * 100).toFixed(2));
}

export interface ServiceMetrics {
  uptimePercentage: number;
  dailyHistory: { timestamp: number; status: string }[];
  lastLatency: number;
  lastErrorRate: string;
  currentStatus: string;
}

async function processGrafanaData(json: any, dbServices: string[]): Promise<Record<string, ServiceMetrics>> {
  const serviceMetricsMap: Record<string, ServiceMetrics> = {};

  dbServices.forEach((serviceName) => {
    // 1. Find the result for this service
    const latRes = json.latency?.data?.result?.find((r: any) =>
      r.metric.service_name === serviceName || r.metric.job === serviceName
    );
    const errRes = json.errorRate?.data?.result?.find((r: any) =>
      r.metric.service_name === serviceName || r.metric.job === serviceName
    );

    // 2. Normalize Data Format:
    // query_range (range mode) uses .values (array)
    // query (live mode) uses .value (single point)
    const latencyRaw =
      latRes?.values ??
      (latRes?.value ? [latRes.value] : []);

    const errorRaw =
      errRes?.values ??
      (errRes?.value ? [errRes.value] : []);

    // 3. If NO data exists at all
    if (latencyRaw.length === 0) {
      serviceMetricsMap[serviceName] = {
        uptimePercentage: 100,
        dailyHistory: generateEmptyHistory(),
        lastLatency: 0,
        lastErrorRate: "0.00",
        currentStatus: "degraded" // Mark as degraded if no telemetry found
      };
      return;
    }

    // 4. Process points (handle varying lengths between latency and error metrics)
    const minLength = Math.min(latencyRaw.length, errorRaw.length);
    const points = [];

    // Fallback: If one metric has data but other doesn't (common in new services)
    const dataToProcess = minLength > 0 ? minLength : latencyRaw.length;

    for (let i = 0; i < dataToProcess; i++) {
      const timestamp = latencyRaw[i][0] * 1000;
      const errorRate = parseFloat(errorRaw[i]?.[1] ?? "0");
      // Use 0 if error rate data is missing at this specific timestamp
      const latency = parseFloat(latencyRaw[i]?.[1] ?? "0");

      points.push({
        timestamp,
        latency,
        errorRate,
        status: computeHealth(latency, errorRate)
      });
    }

    // 5. Group into 14-day history (Only relevant for Range mode)
    const dailyMap = new Map<string, { timestamp: number; status: string }>();
    points.forEach((point) => {
      const dateKey = new Date(point.timestamp).toISOString().split('T')[0];
      const currentDayStatus = dailyMap.get(dateKey)?.status || "operational";

      let newStatus = currentDayStatus;
      if (point.status === "critical" || currentDayStatus === "critical") newStatus = "critical";
      else if (point.status === "warning" || currentDayStatus === "warning") newStatus = "warning";

      dailyMap.set(dateKey, { timestamp: point.timestamp, status: newStatus });
    });

    const latencyValues = points.map(p => p.latency);
    const errorValues = points.map(p => p.errorRate);

    // 6. Final Object Assembly
    serviceMetricsMap[serviceName] = {
      // Uptime and history only make sense in 'range' mode, 
      // but we calculate it anyway so the UI doesn't flicker
      uptimePercentage: computeUptime(latencyValues, errorValues),
      dailyHistory: Array.from(dailyMap.values()).sort((a, b) => a.timestamp - b.timestamp).slice(-14),

      // Live indicators (always the last point in the array)
      lastLatency: Math.round(latencyValues[latencyValues.length - 1] || 0),
      lastErrorRate: (errorValues[errorValues.length - 1] || 0).toFixed(2),
      currentStatus: computeHealth(
        latencyValues[latencyValues.length - 1] || 0,
        errorValues[errorValues.length - 1] || 0
      )
    };
  });

  return serviceMetricsMap;
}

function generateEmptyHistory() {
  const history = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    history.push({ timestamp: d.getTime(), status: "warning" });
  }
  return history;
}


/**
 * Main function to be called from your page.tsx
 */
export async function fetchServiceMetrics(dbServices: string[], mode: 'range' | 'live' = 'range') {
  try {
    const serviceParam = dbServices.join(',');

    const response = await fetch(`/api/grafana/metrics?services=${encodeURIComponent(serviceParam)}&mode=${mode}`);


    // console.log("Fetching:", url);

    if (!response.ok) throw new Error("API response not ok");

    const json = await response.json();

    // Pass both the JSON and the original dbServices array
    return await processGrafanaData(json, dbServices);
  } catch (error) {
    console.error(`Failed to fetch ${mode} metrics:`, error);
    return {};
  }
}