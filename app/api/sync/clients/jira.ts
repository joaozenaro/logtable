import type { JiraIssue } from "@/types";
import { getSettings } from "@/app/actions/settings";

export async function getWorkItemIds(keys: string[]) {
    if (!keys.length) return new Map<string, number>();

    const settings = await getSettings();
    const encoded = btoa(settings.JIRA_TOKEN);

    const response = await fetch(
        `${settings.JIRA_BASE_URL}/rest/api/3/search/jql`,
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${encoded}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                jql: `key IN (${keys.map(k => `'${k}'`).join(",")})`,
                fields: ["id", "key"],
                maxResults: 100,
            }),
        }
    );

    const data = await response.json();

    return new Map<string, number>(
        (data.issues as JiraIssue[]).map(issue => [
            issue.key,
            Number(issue.id),
        ])
    );
}