import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface AIAnalysis {
  rootCause: string;
  explanation: string;
  suggestedFix: string;
  confidence: "High" | "Medium" | "Low";
}

function extractFailureContext(events: any[]): string {
  let context = "";

  for (const event of events) {
    const prov = event.provenance ?? {};

    context += `Source: ${event.source}\n`;
    context += `Event: ${event.event}\n`;

    // ---------------- Workflow ----------------
    if (prov.workflowName) {
      context += `Workflow: ${prov.workflowName}\n`;
    }

    if (prov.branch) {
      context += `Branch: ${prov.branch}\n`;
    }

    if (prov.failedJobs?.length) {
      context += `Failed Job: ${prov.failedJobs
        .map((j: any) => j.name)
        .join(", ")}\n`;
    }

    if (prov.failedSteps?.length) {
      context += `Failed Step: ${prov.failedSteps
        .map((s: any) => s.name)
        .join(", ")}\n`;
    }

    // ---------------- Deployment ----------------
    if (prov.environment) {
      context += `Environment: ${prov.environment}\n`;
    }

    if (prov.description) {
      context += `Deployment Status: ${prov.description}\n`;
    }

    // ---------------- Health ----------------
    if (prov.status !== undefined && prov.url) {
      context += `Health Check: HTTP ${prov.status}\n`;
    }

    // ---------------- Grafana ----------------
    if (prov.metric) {
      context += `Metric: ${prov.metric}\n`;
      context += `Value: ${prov.value}\n`;
      context += `Threshold: ${prov.threshold}\n`;
    }

    context += "\n";
  }

  return context;
}

async function callGroqAPI(prompt: string): Promise<AIAnalysis> {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    throw new Error("Groq API key not configured");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert incident analyzer. Analyze the provided incident details and return a JSON object with exactly these 4 fields:
{
  "rootCause": "The root cause of the incident",
  "explanation": "Detailed explanation of what happened",
  "suggestedFix": "Recommended fix or mitigation",
  "confidence": "High|Medium|Low"
}

Return ONLY the JSON object, no additional text.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Groq API error:", error);
    throw new Error("Failed to call Groq API");
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No response from Groq API");
  }

  try {
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Failed to parse Groq response:", content);
    throw new Error("Failed to parse AI response");
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  try {
    const supabase = await createClient();
    const { incidentId } = await params;
    const teamId = request.nextUrl.searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
    }

    // Verify user is member of team
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    // Fetch incident
    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .select(`
id,
title,
summary,
status,
root_cause_suggestion,
ai_summary,
ai_metadata
`)
      .eq("id", incidentId)
      .eq("team_id", teamId)
      .single();

    if (incidentError || !incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    if (
      incident.ai_summary &&
      incident.root_cause_suggestion &&
      incident.ai_metadata
    ) {
      return NextResponse.json({
        analysis: {
          rootCause: incident.root_cause_suggestion,
          explanation: incident.ai_summary,
          suggestedFix: incident.ai_metadata.suggestedFix,
          confidence: incident.ai_metadata.confidence,
        },
      });
    }

    // Fetch incident events
    const { data: events, error: eventsError } = await supabase
      .from("incident_events")
      .select("id, source, event, provenance, created_at")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (eventsError || !events || events.length === 0) {
      return NextResponse.json(
        {
          analysis: {
            rootCause: "No incident events available for analysis",
            explanation: "Please wait for more data to be collected",
            suggestedFix: "Monitor the incident for additional events",
            confidence: "Low" as const,
          },
        },
        { status: 200 }
      );
    }

    // Extract context from events
    const context = extractFailureContext(events);

    // Build prompt for Groq
    const prompt = `
You are an experienced Site Reliability Engineer.

Analyze the following production incident.

Incident

Title: ${incident.title}
Summary: ${incident.summary}
Status: ${incident.status}

Timeline

${context}

Instructions

• Identify the most likely root cause.
• Explain why the incident occurred.
• Suggest the most effective fix.
• If the information is insufficient, explicitly mention what additional information would help.
• Do not invent facts that are not supported by the incident details.

Return ONLY valid JSON:

{
  "rootCause": "...",
  "explanation": "...",
  "suggestedFix": "...",
  "confidence": "High | Medium | Low"
}
`;

    // Call Groq API
    const analysis = await callGroqAPI(prompt);

    await supabase
      .from("incidents")
      .update({

        root_cause_suggestion: analysis.rootCause,

        ai_summary: analysis.explanation,

        ai_metadata: {

          suggestedFix: analysis.suggestedFix,

          confidence: analysis.confidence,

          generatedAt: new Date().toISOString()

        }

      })
      .eq("id", incidentId);

    const { error: eventError } = await supabase
      .from("incident_events")
      .insert({

        incident_id: incidentId,

        source: "ai",

        event: "AI analysis completed",

        provenance: {

          confidence: analysis.confidence,

          generatedAt: new Date().toISOString(),

        }

      });
    if (eventError) {
      return NextResponse.json(
        { error: eventError.message },
        { status: 500 }
      );

    }

    return NextResponse.json({
      analysis,
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        analysis: {
          rootCause: "Unable to analyze incident at this time",
          explanation: "An error occurred during analysis",
          suggestedFix: "Please try again later",
          confidence: "Low" as const,
        },
      },
      { status: 200 }
    );
  }
}
