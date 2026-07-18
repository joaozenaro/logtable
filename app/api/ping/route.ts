import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json(
            { message: "Unauthorized", status: 403 },
            { status: 403 },
        );
    }

    return NextResponse.json({
        message: "pong",
        status: 200,
        user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
        },
    });
}
