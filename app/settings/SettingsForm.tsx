"use client";

import { saveSettings } from "@/app/actions/settings";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useToast } from "@/components/ToastProvider";
import { useState } from "react";

export interface SafeSettings {
    JIRA_BASE_URL: string;
    SEVENPACE_BASE_URL: string;
    ASSIGNEE_ID: string;
    hasJiraToken: boolean;
    hasSevenpaceToken: boolean;
}

export default function SettingsForm({
    initialSettings,
}: {
    initialSettings: SafeSettings;
}) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            await saveSettings(formData);
            showToast({ message: "Settings saved successfully" });
        } catch {
            showToast({
                message: "Failed to save settings",
                severity: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
            autoComplete="off"
        >
            <TextField
                name="JIRA_BASE_URL"
                label="Jira Base URL"
                defaultValue={initialSettings.JIRA_BASE_URL}
                placeholder="https://your-domain.atlassian.net"
                autoComplete="off"
                fullWidth
            />
            <TextField
                name="JIRA_TOKEN"
                label={
                    initialSettings.hasJiraToken
                        ? "Jira Token (email:token) - Saved ✓"
                        : "Jira Token (email:token)"
                }
                placeholder={
                    initialSettings.hasJiraToken
                        ? "Leave blank to keep existing token"
                        : ""
                }
                type="password"
                autoComplete="new-password"
                fullWidth
            />
            <TextField
                name="SEVENPACE_BASE_URL"
                label="7pace Base URL"
                defaultValue={initialSettings.SEVENPACE_BASE_URL}
                placeholder="https://your-domain.7pace.com"
                autoComplete="off"
                fullWidth
            />
            <TextField
                name="SEVENPACE_TOKEN"
                label={
                    initialSettings.hasSevenpaceToken
                        ? "7pace Token - Saved ✓"
                        : "7pace Token"
                }
                placeholder={
                    initialSettings.hasSevenpaceToken
                        ? "Leave blank to keep existing token"
                        : ""
                }
                type="password"
                autoComplete="new-password"
                fullWidth
            />
            <TextField
                name="ASSIGNEE_ID"
                label="Assignee ID"
                defaultValue={initialSettings.ASSIGNEE_ID}
                autoComplete="off"
                fullWidth
            />
            <div className="mt-4">
                <Button type="submit" variant="contained" disabled={loading}>
                    {loading ? "Saving..." : "Save Settings"}
                </Button>
            </div>
        </form>
    );
}
