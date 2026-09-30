import { getSettings, Settings } from "@/app/actions/settings";

interface SaveWorklogRequestBody {
    comment: string;
    duration: string;
    externalItemId: string;
    date?: string;
}

export async function getCustomFields(settings: Settings) {
    try {
        const response = await fetch(
            `${settings.SEVENPACE_BASE_URL}/api/v2/settings/customFields`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${settings.SEVENPACE_TOKEN}`,
                    "Content-Type": "application/json",
                },
            },
        );
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        const customFields = [];

        // Toggles
        const toggles = data.result?.customFields?.toggle || [];
        for (const toggle of toggles) {
            if (toggle.enabled) {
                customFields.push({
                    id: toggle.id,
                    type: "toggle",
                    value: toggle.default ?? false,
                    name: toggle.name,
                });
            }
        }

        // Dropdowns
        const dropdowns = data.result?.customFields?.dropdown || [];
        for (const dropdown of dropdowns) {
            if (dropdown.enabled) {
                const defaultOption = dropdown.options?.[0];
                if (defaultOption) {
                    customFields.push({
                        id: dropdown.id,
                        type: "dropdown",
                        value: {
                            id: defaultOption.id,
                        },
                    });
                }
            }
        }

        return customFields;
    } catch (error) {
        console.warn(
            "Failed to fetch custom fields, proceeding without them:",
            error,
        );
        return [];
    }
}

/** Name of the 7pace custom toggle mirrored by the grid's Billable column. */
export const BILLABLE_FIELD_NAME = "Billable";

/**
 * Returns a copy of `customFields` with the Billable toggle's value set for
 * this row. The toggle is matched by name, because its id is per-team.
 *
 * If no toggle matches, the fields are returned unchanged: the toggle is
 * optional, so a team without one should still sync normally.
 */
export function withBillableValue(
    customFields: CustomFieldItem[],
    billable: boolean,
): CustomFieldItem[] {
    return customFields.map((field) =>
        field.type === "toggle" &&
        (field.name ?? "").trim().toLowerCase() ===
            BILLABLE_FIELD_NAME.toLowerCase()
            ? { ...field, value: billable }
            : field,
    );
}

/** True when the team has a Billable toggle to write to. */
export function hasBillableField(customFields: CustomFieldItem[]): boolean {
    return customFields.some(
        (field) =>
            field.type === "toggle" &&
            (field.name ?? "").trim().toLowerCase() ===
                BILLABLE_FIELD_NAME.toLowerCase(),
    );
}

/**
 * Strips the local-only `name` before sending, so the request body stays
 * exactly what 7pace expects.
 */
function toWireFormat(customFields: CustomFieldItem[]) {
    return customFields.map(({ id, type, value }) => ({ id, type, value }));
}

function getStartedAt(date?: string): string {
    let baseDate = new Date();
    if (date) {
        const [year, month, day] = date.split("-").map(Number);
        if (year && month && day) {
            baseDate = new Date(year, month - 1, day);
        }
    }
    return new Date(baseDate.setHours(9, 0, 0, 0)).toISOString().slice(0, 19);
}

export interface CustomFieldItem {
    id: string;
    type: string;
    value: boolean | { id: string } | unknown;
    /** Present on fields the API describes; used to find the Billable toggle. */
    name?: string;
}

export async function createWorklog(
    body: SaveWorklogRequestBody,
    preFetchedCustomFields?: CustomFieldItem[],
    preFetchedSettings?: Settings,
) {
    const settings = preFetchedSettings ?? (await getSettings());
    const customFields =
        preFetchedCustomFields ?? (await getCustomFields(settings));
    const startedAt = getStartedAt(body.date);

    const { ...worklogBody } = body;

    const payload = {
        ...worklogBody,
        assigneeId: settings.ASSIGNEE_ID,
        startedAt,
        customFields: toWireFormat(customFields),
    };

    const response = await fetch(
        `${settings.SEVENPACE_BASE_URL}/api/v2/worklogs`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${settings.SEVENPACE_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        },
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.json();
}

export async function deleteWorklog(remoteId: string, settings: Settings) {
    const response = await fetch(
        `${settings.SEVENPACE_BASE_URL}/api/v2/worklogs/${remoteId}`,
        {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${settings.SEVENPACE_TOKEN}`,
            },
        },
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }
}

export async function updateWorklog(
    remoteId: string,
    body: SaveWorklogRequestBody,
    preFetchedCustomFields?: CustomFieldItem[],
    preFetchedSettings?: Settings,
) {
    const settings = preFetchedSettings ?? (await getSettings());
    const customFields =
        preFetchedCustomFields ?? (await getCustomFields(settings));
    const startedAt = getStartedAt(body.date);

    const { ...worklogBody } = body;

    const payload = {
        ...worklogBody,
        assigneeId: settings.ASSIGNEE_ID,
        startedAt,
        customFields: toWireFormat(customFields),
    };

    const response = await fetch(
        `${settings.SEVENPACE_BASE_URL}/api/v2/worklogs/${remoteId}`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${settings.SEVENPACE_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        },
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.json();
}
