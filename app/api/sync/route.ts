import { Log } from "@/types";
import { getWorkItemIds } from "./clients/jira";
import { createWorklog } from "./clients/sevenpace";
import { ParseReturn, parseTime } from "@/lib/time";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json(
            { message: "Unauthorized", status: 403 },
            { status: 403 },
        );
    }

    const logs: Log[] = []; // TODO: Current day logs
    await syncLogs(logs);
}

async function syncLogs(logs: Log[]) {
    const workItemMap = await getWorkItemIds(
        [...new Set(logs.map(l => l.workItem))]
    );

    for (const log of logs) {
        const workItemId = workItemMap.get(log.workItem);

        if (!workItemId) {
            console.warn(`Missing work item ${log.workItem}`);
            continue;
        }

        await createWorklog({
            comment: log.description,
            duration: parseTime(log.timeSpent, ParseReturn.Seconds).toString(),
            externalItemId: String(workItemId),
        });
    }
}