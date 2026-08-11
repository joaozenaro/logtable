import { getSettings, Settings } from "@/app/actions/settings";

interface CreateWorklogRequest {
    comment: string;
    duration: string;
    externalItemId: string;
}

async function getCustomFields(settings: Settings) {
    try {
        const response = await fetch(
            `${settings.SEVENPACE_BASE_URL}/api/v2/settings/customFields`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${settings.SEVENPACE_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
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
                    value: toggle.default ?? false
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
                            id: defaultOption.id
                        }
                    });
                }
            }
        }

        return customFields;
    } catch (error) {
        console.warn("Failed to fetch custom fields, proceeding without them:", error);
        return [];
    }
}

export async function createWorklog(body: CreateWorklogRequest) {
    const settings = await getSettings();
    const customFields = await getCustomFields(settings);
    const startedAt = new Date(new Date().setHours(9, 0, 0, 0))
        .toISOString()
        .slice(0, 19);

    const payload = {
        ...body,
        assigneeId: settings.ASSIGNEE_ID,
        startedAt,
        customFields,
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
        }
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return response.json();
}