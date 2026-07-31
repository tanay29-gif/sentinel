import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const baseUrl = req.nextUrl.searchParams.get("baseUrl");

    if (!baseUrl) {
        return NextResponse.json(
            { error: "Missing baseUrl" },
            { status: 400 }
        );
    }

    try {
        const response = await fetch(`${baseUrl}/health`, {
            signal: AbortSignal.timeout(5000),
            cache: "no-store",
        });
    //   console.log(response.ok)
        return NextResponse.json({
            ok: response.ok,
            status: response.status,
        });
    } catch {
        return NextResponse.json(
            {
                ok: false,
                status: 0,
            },
            {
                status: 200,
            }
        );
    }
}