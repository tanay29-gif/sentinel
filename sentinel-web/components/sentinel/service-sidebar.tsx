"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Copy, Check, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client"; // Ensure you have a browser-side client helper

export default function AddServiceSidebar() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const teamId = params.teamId as string;

  const [isOpen, setIsOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [copied, setCopied] = useState(false);

  // Validation States
  const [isChecking, setIsChecking] = useState(false);
  const [nameStatus, setNameStatus] = useState<"idle" | "valid" | "exists" | "invalid">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  // 1. Debounced Check for Service Name availability
  useEffect(() => {
    if (serviceName.length < 3) {
      setNameStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      const { data, error } = await supabase
        .from("services")
        .select("id")
        .eq("team_id", teamId)
        .eq("name", serviceName.toLowerCase())
        .maybeSingle();

      if (data) {
        setNameStatus("exists");
      } else {
        setNameStatus("valid");
      }
      setIsChecking(false);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [serviceName, teamId, supabase]);

  // 2. Handle Creation
  const handleCreateService = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("services").insert({
        team_id: teamId,
        name: serviceName.toLowerCase().trim(),
        health: "unknown", // Default state until telemetry starts
        uptime: 0,
        base_url: baseUrl.trim(),
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Close and Refresh
      setIsOpen(false);
      setServiceName("");
      setBaseUrl("");
      router.refresh(); // This re-fetches the list on the main page
    } catch (err) {
      alert("Failed to create service. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidBaseUrl = (() => {
  try {
    new URL(baseUrl);
    return true;
  } catch {
    return false;
  }
})();

  // Dynamic setup code showing the actual service name
  const setupCode = `
//add this route to get the accurate service health status
// request will be ${baseUrl || "http://localhost:8000"}/health

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
  });
});

//telemetry.js

// npm install @opentelemetry/sdk-node \
//             @opentelemetry/auto-instrumentations-node \
//             @opentelemetry/exporter-metrics-otlp-http \
//             @opentelemetry/resources \
//             @opentelemetry/semantic-conventions \
//             @opentelemetry/host-metrics

import 'dotenv/config';

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

//in the .env file, add the following variables
// OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-ap-south-1.grafana.net/otlp
// OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic%20MTY5OTE0MzpnbGNfZXlKdklqb2lNVGd5TURBNE1TSXNJbTRpT2lKelpXNTBhVzVsYkNJc0ltc2lPaUpXWlVSUU1EZzBSVEV6VVU5dk1EbFBkR3cwWW1seE1qRWlMQ0p0SWpwN0luSWlPaUp3Y205a0xXRndMWE52ZFhSb0xURWlmWDA9

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],

   resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: ${serviceName || "your-service-name"},
    [ATTR_SERVICE_VERSION]: "1.0.0",
  }),
});
try {
  await sdk.start();
  console.log("OpenTelemetry started");
} catch (err) {
  console.error("Failed to start OpenTelemetry", err);

  // this is for checking the the webhook works or not 
}
  `;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(setupCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        suppressHydrationWarning
        className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-all active:scale-95"
      >
        <Plus size={18} strokeWidth={1.5} />
        Add service
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/30 backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 right-0 z-[101] w-full max-w-md bg-white shadow-2xl transition-transform duration-300 transform ${isOpen ? "translate-x-0" : "translate-x-full"
          } border-l border-slate-200`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add New Service</h2>
              <p className="text-sm text-slate-500">Register a service for team: {teamId.split('-')[0]}...</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded-full p-2 hover:bg-slate-100">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Service Name Input with Validation UI */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">Service Name</label>
                {isChecking && <Loader2 size={14} className="animate-spin text-slate-400" />}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. authentication-api"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value.replace(/\s+/g, '-'))}
                  className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition-all ${nameStatus === 'exists' ? 'border-red-500 focus:ring-red-50' :
                    nameStatus === 'valid' ? 'border-emerald-500 focus:ring-emerald-50' :
                      'border-slate-200 focus:border-slate-950'
                    }`}
                />
                <div className="absolute right-3 top-3.5">
                  {nameStatus === 'valid' && <CheckCircle2 size={18} className="text-emerald-500" />}
                  {nameStatus === 'exists' && <AlertCircle size={18} className="text-red-500" />}
                </div>
              </div>

              {nameStatus === 'exists' && (
                <p className="text-xs text-red-500 font-medium">This service name is already taken by your team.</p>
              )}
              {nameStatus === 'valid' && (
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <Check size={12} /> Service name available
                </p>
              )}

              {/* Base URL */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Base URL
                </label>

                <input
                  type="url"
                  placeholder="http://localhost:8000"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-slate-900"
                />

                <p className="text-xs text-slate-500">
                  Used to check the service health via {baseUrl}
                  <code>/health</code>.
                </p>
              </div>
            </div>

            {/* Installation Code Block */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">1. Add this to your project</label>
              <div className="relative group">
                <pre className="overflow-x-auto rounded-xl bg-slate-950 p-5 text-[12px] font-mono text-slate-300">
                  <code>{setupCode.trim()}</code>
                </pre>
                <button onClick={copyToClipboard} className="absolute right-3 top-3 bg-slate-800 p-1.5 rounded text-slate-300 hover:text-white">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>



          <div className="p-6 bg-slate-50 border-t border-slate-100">
            <button
              onClick={handleCreateService}
              disabled={nameStatus !== "valid" ||
                 !isValidBaseUrl ||
                isSubmitting}
              className="w-full rounded-xl bg-slate-900 py-4 text-sm font-bold text-white shadow-lg hover:bg-slate-800 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? "Creating..." : "Create the service"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}