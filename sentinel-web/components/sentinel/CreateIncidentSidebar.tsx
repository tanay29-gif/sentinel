"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Service {
  id: string;
  name: string;
}

export default function CreateIncidentSidebar() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const teamId = params.teamId as string;

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");

  const [summary, setSummary] = useState("");

  const [severity, setSeverity] = useState("SEV-3");

  const [serviceId, setServiceId] = useState("");

  const [rootCause, setRootCause] = useState("");

  const [services, setServices] = useState<Service[]>([]);

  async function loadServices() {
    if (services.length) return;

    const { data } = await supabase
      .from("services")
      .select("id,name")
      .eq("team_id", teamId)
      .order("name");

    setServices(data || []);
  }

  async function openSidebar() {
    await loadServices();
    setOpen(true);
  }

  async function createIncident() {
    if (!title.trim() || !summary.trim()) return;

    setLoading(true);

    try {
      const { data: incident, error } = await supabase
        .from("incidents")
        .insert({
          team_id: teamId,

          service_id: serviceId || null,

          source: "manual",

          title,

          severity,

          status: "Active",

          summary,

          root_cause_suggestion: rootCause,

          ai_summary: null,

          ai_metadata: {},

          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("incident_events").insert({
        incident_id: incident.id,

        source: "manual",

        event: "Incident created manually",

        provenance: {
          createdBy: "user",
        },
      });

      setOpen(false);

      setTitle("");
      setSummary("");
      setSeverity("SEV-3");
      setRootCause("");
      setServiceId("");

      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Unable to create incident.");
    }

    setLoading(false);
  }

  return (
    <>
      <button
        onClick={openSidebar}
        className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition"
      >
        <Plus size={18} />
        New Incident
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed right-0 top-0 z-[101] h-screen w-full max-w-md bg-white border-l border-slate-200 shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}

          <div className="flex items-center justify-between border-b p-6">
            <div>
              <h2 className="text-lg font-bold">
                Create Incident
              </h2>

              <p className="text-sm text-slate-500">
                Create a manual production incident.
              </p>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-2 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title */}

            <div>
              <label className="text-sm font-medium">
                Incident Title
              </label>

              <input
                className="mt-2 w-full rounded-lg border px-4 py-3"
                placeholder="Database unavailable"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Severity */}

            <div>
              <label className="text-sm font-medium">
                Severity
              </label>

              <select
                className="mt-2 w-full rounded-lg border px-4 py-3"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option>SEV-1</option>
                <option>SEV-2</option>
                <option>SEV-3</option>
                <option>SEV-4</option>
              </select>
            </div>

            {/* Service */}

            <div>
              <label className="text-sm font-medium">
                Service
              </label>

              <select
                className="mt-2 w-full rounded-lg border px-4 py-3"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">
                  None
                </option>

                {services.map((service) => (
                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Summary */}

            <div>
              <label className="text-sm font-medium">
                Summary
              </label>

              <textarea
                rows={5}
                className="mt-2 w-full rounded-lg border px-4 py-3"
                placeholder="Describe what happened..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            {/* Root Cause */}

            <div>
              <label className="text-sm font-medium">
                Root Cause Suggestion
              </label>

              <textarea
                rows={4}
                className="mt-2 w-full rounded-lg border px-4 py-3"
                placeholder="Optional..."
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}

          <div className="border-t bg-slate-50 p-6">
            <button
              onClick={createIncident}
              disabled={
                loading ||
                !title.trim() ||
                !summary.trim()
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
            >
              {loading && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {loading
                ? "Creating..."
                : "Create Incident"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}