"use server";

import "server-only";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/crypto";

export interface Settings {
    JIRA_TOKEN: string;
    JIRA_BASE_URL: string;
    SEVENPACE_TOKEN: string;
    SEVENPACE_BASE_URL: string;
    ASSIGNEE_ID: string;
}

export async function requireAuth() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        throw new Error("Unauthorized");
    }
}

export async function saveSettings(formData: FormData) {
    await requireAuth();
    
    const cookieStore = await cookies();
    const existingSettings = await getSettings();
    
    const settingsToSave: Settings = {
        JIRA_BASE_URL: (formData.get('JIRA_BASE_URL') as string) || existingSettings.JIRA_BASE_URL || "",
        JIRA_TOKEN: (formData.get('JIRA_TOKEN') as string) || existingSettings.JIRA_TOKEN || "",
        SEVENPACE_BASE_URL: (formData.get('SEVENPACE_BASE_URL') as string) || existingSettings.SEVENPACE_BASE_URL || "",
        SEVENPACE_TOKEN: (formData.get('SEVENPACE_TOKEN') as string) || existingSettings.SEVENPACE_TOKEN || "",
        ASSIGNEE_ID: (formData.get('ASSIGNEE_ID') as string) || existingSettings.ASSIGNEE_ID || "",
    };

    const payload = encrypt(JSON.stringify(settingsToSave));

    cookieStore.set('app_settings', payload, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 365 * 24 * 60 * 60,
        path: '/'
    });
}

export async function getSettings(): Promise<Settings> {
    await requireAuth();

    const cookieStore = await cookies();
    const encrypted = cookieStore.get('app_settings')?.value;
    
    const defaultSettings: Settings = {
        JIRA_TOKEN: "",
        JIRA_BASE_URL: "",
        SEVENPACE_TOKEN: "",
        SEVENPACE_BASE_URL: "",
        ASSIGNEE_ID: ""
    };

    if (!encrypted) {
        return defaultSettings;
    }

    try {
        const decrypted = decrypt(encrypted);
        return JSON.parse(decrypted) as Settings;
    } catch (e) {
        console.error("Failed to decrypt settings", e);
        return defaultSettings;
    }
}
