import { getSettings } from "@/app/actions/settings";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
    const settings = await getSettings();

    const safeSettings = {
        JIRA_BASE_URL: settings.JIRA_BASE_URL,
        SEVENPACE_BASE_URL: settings.SEVENPACE_BASE_URL,
        ASSIGNEE_ID: settings.ASSIGNEE_ID,
        hasJiraToken: !!settings.JIRA_TOKEN,
        hasSevenpaceToken: !!settings.SEVENPACE_TOKEN,
    };

    return (
        <div className="p-8 max-w-2xl mx-auto w-full">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>
            <SettingsForm initialSettings={safeSettings} />
        </div>
    );
}
