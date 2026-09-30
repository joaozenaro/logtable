import { SyncLogPayload } from "@/types";
import { getWorkItemIds } from "./clients/jira";
import {
    createWorklog,
    updateWorklog,
    deleteWorklog,
    getCustomFields,
} from "./clients/sevenpace";
import { ParseReturn, parseTime } from "@/lib/time";
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

    const body = await request.json();
    let logs: SyncLogPayload[] = [];
    let deletes: string[] = [];
    let date: string | undefined = undefined;

    if (Array.isArray(body)) {
        logs = body;
    } else if (body && typeof body === "object") {
        logs = body.logs || [];
        deletes = body.deletes || [];
        date = body.date;
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

                for (let i = 0; i < logs.length; i++) {
                    const log = logs[i];
                    const workItemId = workItemMap.get(log.workItem);

                    if (!workItemId) {
                        const event = {
                            kind: "sync",
                            index: i,
                            status: "error",
                            error: `Missing work item ${log.workItem}`,
                        };
                        controller.enqueue(
                            encoder.encode(
                                `data: ${JSON.stringify(event)}\n\n`,
                            ),
                        );
                        continue;
                    }

                    try {
                        const worklogBody = {
                            comment: log.description,
                            duration: parseTime(
                                log.timeSpent,
                                ParseReturn.Seconds,
                            ).toString(),
                            externalItemId: String(workItemId),
                            date,
                        };

                        let result;
                        if (log.remoteId) {
                            result = await updateWorklog(
                                log.remoteId,
                                worklogBody,
                                customFields,
                                settings,
                            );
                        } else {
                            result = await createWorklog(
                                worklogBody,
                                customFields,
                                settings,
                            );
                        }

                        const remoteId = result?.worklog?.id ?? log.remoteId;
                        const event = {
                            kind: "sync",
                            index: i,
                            status: "synced",
                            remoteId: remoteId ? String(remoteId) : undefined,
                        };
                        controller.enqueue(
                            encoder.encode(
                                `data: ${JSON.stringify(event)}\n\n`,
                            ),
                        );
                    } catch (error) {
                        const event = {
                            kind: "sync",
                            index: i,
                            status: "error",
                            error: String(error),
                        };
                        controller.enqueue(
                            encoder.encode(
                                `data: ${JSON.stringify(event)}\n\n`,
                            ),
                        );
                    }
                }

                for (let i = 0; i < deletes.length; i++) {
                    const remoteId = deletes[i];

                    try {
                        await deleteWorklog(remoteId, settings);
                        const event = {
                            kind: "delete",
                            index: i,
                            status: "deleted",
                        };
                        controller.enqueue(
                            encoder.encode(
                                `data: ${JSON.stringify(event)}\n\n`,
                            ),
                        );
                    } catch (error) {
                        const event = {
                            kind: "delete",
                            index: i,
                            status: "error",
                            error: String(error),
                        };
                        controller.enqueue(
                            encoder.encode(
                                `data: ${JSON.stringify(event)}\n\n`,
                            ),
                        );
                    }
                }
            } catch (error) {
                const event = {
                    kind: "sync",
                    index: -1,
                    status: "error",
                    error: String(error),
                };
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
                );
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
