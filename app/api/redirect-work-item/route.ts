import { NextRequest, NextResponse } from "next/server";
import { getSettings, requireAuth } from "@/app/actions/settings";

export async function GET(request: NextRequest) {
    try {
        await requireAuth();
    } catch {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");
    if (!key) {
        return new NextResponse("Missing key", { status: 400 });
    }

    const settings = await getSettings();
    const baseUrl = settings.JIRA_BASE_URL;

    if (!baseUrl) {
        return new NextResponse("Missing Jira Base URL in settings", {
            status: 400,
        });
    }

    try {
        const parsedUrl = new URL(baseUrl);
        if (parsedUrl.protocol !== "https:") {
            return new NextResponse("Jira Base URL must use HTTPS", {
                status: 400,
            });
        }

        // Construct URL securely based on parsed domain
        const url = new URL(
            `/browse/${encodeURIComponent(key)}`,
            parsedUrl.origin,
        ).toString();

        return NextResponse.redirect(url);
    } catch {
        return new NextResponse("Invalid Jira Base URL", { status: 400 });
    }
}
