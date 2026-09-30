import {
    SyncEvent,
    SyncLogPayload,
    SyncRequestBody,
    toSseData,
} from "@/lib/syncTypes";
import { getWorkItemIds } from "@/lib/integrations/jira";
import {
    createWorklog,
    updateWorklog,
    deleteWorklog,
    getCustomFields,
    hasBillableField,
    withBillableValue,
} from "@/lib/integrations/sevenpace";
import { TimeUnit, parseTime } from "@/lib/time";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getSettings } from "@/app/actions/settings";

export async function POST(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json(
            { message: "Unauthorized", status: 403 },
            { status: 403 },
        );
    }

    const body: SyncRequestBody | SyncLogPayload[] = await request.json();
    let logs: SyncLogPayload[] = [];
    let deletes: string[] = [];
    let date: string | undefined = undefined;

    if (Array.isArray(body)) {
        // Legacy clients sent a bare array of logs, with no deletes and no date.
        logs = body;
    } else if (body && typeof body === "object") {
        logs = body.logs || [];
        deletes = body.deletes || [];
        date = body.date ?? undefined;
    }

    const encoder = new TextEncoder();

    const settings = await getSettings();
    const hasSettings =
        settings.JIRA_TOKEN &&
        settings.JIRA_BASE_URL &&
        settings.SEVENPACE_TOKEN &&
        settings.SEVENPACE_BASE_URL &&
        settings.ASSIGNEE_ID;

    if (!hasSettings) {
        return NextResponse.json(
            { message: "Invalid settings" },
            { status: 400 },
        );
    }

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const customFields = await getCustomFields(settings);
                const workItemMap = await getWorkItemIds(
                    [...new Set(logs.map((l) => l.workItem))],
                    settings,
                );

                if (!hasBillableField(customFields)) {
                    console.warn(
                        "No enabled 7pace toggle named 'Billable' was found; " +
                            "the Billable column will not be synced.",
                    );
                }

                for (let i = 0; i < logs.length; i++) {
                    const log = logs[i];
                    const workItemId = workItemMap.get(log.workItem);

                    if (!workItemId) {
                        const event: SyncEvent = {
                            kind: "sync",
                            index: i,
                            status: "error",
                            error: `Missing work item ${log.workItem}`,
                        };
                        controller.enqueue(encoder.encode(toSseData(event)));
                        continue;
                    }

                    try {
                        const worklogBody = {
                            comment: log.description,
                            duration: parseTime(
                                log.timeSpent,
                                TimeUnit.Seconds,
                            ).toString(),
                            externalItemId: String(workItemId),
                            date,
                        };

                        // A row with no stored value predates the column and
                        // is billable, matching the toggle's own default.
                        const rowCustomFields = withBillableValue(
                            customFields,
                            log.billable ?? true,
                        );

                        let result;
                        if (log.remoteId) {
                            result = await updateWorklog(
                                log.remoteId,
                                worklogBody,
                                rowCustomFields,
                                settings,
                            );
                        } else {
                            result = await createWorklog(
                                worklogBody,
                                rowCustomFields,
                                settings,
                            );
                        }

                        const remoteId = result?.worklog?.id ?? log.remoteId;
                        const event: SyncEvent = {
                            kind: "sync",
                            index: i,
                            status: "synced",
                            remoteId: remoteId ? String(remoteId) : undefined,
                        };
                        controller.enqueue(encoder.encode(toSseData(event)));
                    } catch (error) {
                        const event: SyncEvent = {
                            kind: "sync",
                            index: i,
                            status: "error",
                            error: String(error),
                        };
                        controller.enqueue(encoder.encode(toSseData(event)));
                    }
                }

                for (let i = 0; i < deletes.length; i++) {
                    const remoteId = deletes[i];

                    try {
                        await deleteWorklog(remoteId, settings);
                        const event: SyncEvent = {
                            kind: "delete",
                            index: i,
                            status: "deleted",
                        };
                        controller.enqueue(encoder.encode(toSseData(event)));
                    } catch (error) {
                        const event: SyncEvent = {
                            kind: "delete",
                            index: i,
                            status: "error",
                            error: String(error),
                        };
                        controller.enqueue(encoder.encode(toSseData(event)));
                    }
                }
            } catch (error) {
                const event: SyncEvent = {
                    kind: "sync",
                    index: -1,
                    status: "error",
                    error: String(error),
                };
                controller.enqueue(encoder.encode(toSseData(event)));
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
