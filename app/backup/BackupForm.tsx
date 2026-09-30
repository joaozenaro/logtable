"use client";

import { useRef, useState } from "react";
import { styled } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import { useToast } from "@/components/ToastProvider";
import {
    buildBackup,
    groupByDate,
    parseBackup,
    restoreBackup,
    InvalidBackupError,
    type Backup,
} from "@/lib/backup";

const VisuallyHiddenInput = styled("input")({
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    width: 1,
});

/** Downloads the given content as a file, without leaving the page. */
function downloadJson(filename: string, data: unknown) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

export default function BackupForm() {
    const { showToast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [pending, setPending] = useState<Backup | null>(null);
    const [pendingFilename, setPendingFilename] = useState("");
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const backup = await buildBackup();

            if (backup.rows.length === 0) {
                showToast({
                    message: "Nothing to export yet",
                    severity: "info",
                });
                return;
            }

            downloadJson(
                `logtable-backup-${backup.exportedAt.slice(0, 10)}.json`,
                backup,
            );
            showToast({
                message: `Exported ${backup.rows.length} rows`,
            });
        } catch {
            showToast({ message: "Export failed", severity: "error" });
        } finally {
            setExporting(false);
        }
    };

    const handleFile = async (file: File) => {
        setPending(null);
        setPendingFilename(file.name);

        try {
            const backup = parseBackup(JSON.parse(await file.text()));
            setPending(backup);
        } catch (error) {
            showToast({
                message:
                    error instanceof InvalidBackupError
                        ? error.message
                        : "Could not read that file",
                severity: "error",
            });
        }
    };

    const handleImport = async () => {
        if (!pending) return;

        setImporting(true);
        try {
            const count = await restoreBackup(pending);
            setPending(null);
            showToast({ message: `Imported ${count} rows` });
        } catch {
            showToast({ message: "Import failed", severity: "error" });
        } finally {
            setImporting(false);
            // Allow re-selecting the same file after a failure.
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const dates = pending ? [...groupByDate(pending.rows)] : [];

    return (
        <Stack spacing={3} className="max-w-2xl">
            <Alert severity="info">
                Backups include every day stored in this browser, along with the
                sync state. They do not include your work item hints or
                settings.
            </Alert>

            <div>
                <Typography variant="subtitle2" gutterBottom>
                    Export
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    loading={exporting}
                    loadingPosition="start"
                    onClick={handleExport}
                >
                    Download backup
                </Button>
            </div>

            <div>
                <Typography variant="subtitle2" gutterBottom>
                    Import
                </Typography>
                <Button
                    component="label"
                    role={undefined}
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                    tabIndex={-1}
                >
                    Choose backup file
                    <VisuallyHiddenInput
                        ref={inputRef}
                        type="file"
                        accept="application/json,.json"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) handleFile(file);
                        }}
                    />
                </Button>

                {pending && (
                    <Alert severity="warning" className="mt-3">
                        <AlertTitle>
                            Replace {pending.rows.length} rows across{" "}
                            {dates.length} {dates.length === 1 ? "day" : "days"}
                            ?
                        </AlertTitle>
                        <ul className="mt-1 mb-0 pl-5 max-h-40 overflow-y-auto">
                            {[...dates].reverse().map(([date, stats]) => (
                                <li key={date}>
                                    {date}: {stats.count}{" "}
                                    {stats.count === 1 ? "row" : "rows"} (
                                    {stats.hasSynced} already synced)
                                </li>
                            ))}
                        </ul>
                        <Typography variant="body2" className="mt-2">
                            Days not listed are left untouched. Existing rows
                            for the days above are replaced.
                        </Typography>
                        <div className="mt-3 flex gap-2">
                            <Button
                                variant="contained"
                                color="warning"
                                loading={importing}
                                loadingPosition="start"
                                onClick={handleImport}
                            >
                                Replace
                            </Button>
                            <Button
                                variant="text"
                                onClick={() => {
                                    setPending(null);
                                    if (inputRef.current)
                                        inputRef.current.value = "";
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </Alert>
                )}
            </div>

            {pendingFilename && !pending && (
                <Typography variant="body2" color="text.secondary">
                    {pendingFilename} was not a valid backup.
                </Typography>
            )}
        </Stack>
    );
}
