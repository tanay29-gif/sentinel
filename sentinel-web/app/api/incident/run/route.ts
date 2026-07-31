import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { checkHealth } from "@/lib/incident/handler/checkHealth";
import { checkGrafanaMetrics } from "@/lib/incident/handler/grafanaMetrics";

interface Service {
  id: string;
  team_id: string;
  name: string;
  base_url: string;
}

export async function POST() {
  try {

    const { data: services, error } = await supabaseAdmin
      .from("services")
      .select("id, team_id, name, base_url")
      .returns<Service[]>();

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!services || services.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No services registered.",
      });
    }

    await checkHealth(services);

    await checkGrafanaMetrics(services);

    return NextResponse.json({
      success: true,
      servicesChecked: services.length,
      checkedAt: new Date().toISOString(),
    });

  } catch (err: any) {

    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}