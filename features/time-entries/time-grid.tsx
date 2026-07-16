"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { Box, Typography, Skeleton } from "@mui/material";
import DOMPurify from "dompurify";
import type { HotTableRef } from "@handsontable/react-wrapper";
import {
  AutocompleteCellType,
  registerCellType,
  TextCellType,
} from "handsontable/cellTypes";
import { registerEditor, AutocompleteEditor } from "handsontable/editors";
import { registerRenderer, autocompleteRenderer } from "handsontable/renderers";
import {
  registerValidator,
  autocompleteValidator,
} from "handsontable/validators";
import { CopyPaste, StretchColumns } from "handsontable/plugins";
import { ManualRowMove } from "handsontable/plugins/manualRowMove";
import { registerPlugin } from "handsontable/plugins/registry";
import type { CellChange, ChangeSource } from "handsontable/base";
import { TimeEntry } from "@/types";
import Shortcut from "@/components/Shortcut";

// Register Handsontable plugins/cell-types once at module level
registerCellType(TextCellType);
registerPlugin(ManualRowMove);
registerPlugin(StretchColumns);
registerPlugin(CopyPaste);

// Autocomplete
registerCellType(AutocompleteCellType);
registerEditor(AutocompleteEditor);
registerRenderer(autocompleteRenderer);
registerValidator(autocompleteValidator);

// Dynamically import HotTable to avoid SSR issues
const HotTable = dynamic(
  () => import("@handsontable/react-wrapper").then((mod) => mod.HotTable),
  {
    ssr: false,
    loading: () => (
      <Skeleton variant="rectangular" height={300} sx={{ width: "100%" }} />
    ),
  },
);

interface TimeGridProps {
  entries: TimeEntry[];
  setEntries: React.Dispatch<React.SetStateAction<TimeEntry[]>>;
  totalTime: string;
}

export default function TimeGrid({
  entries,
  setEntries,
  totalTime,
}: TimeGridProps) {
  const hotRef = useRef<HotTableRef>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const hot = hotRef.current?.hotInstance;
      if (!hot) return;

      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        const newRowIndex = hot.countRows();
        hot.alter("insert_row_below", newRowIndex - 1, 1);
        hot.selectCell(newRowIndex, 0);
      } else if (e.shiftKey && e.key === "Backspace") {
        e.preventDefault();
        const selected = hot.getSelectedRangeLast();
        if (!selected) return;

        const rowIndex = selected.from.row ?? 0;
        hot.alter("remove_row", rowIndex, 1);

        const newRowCount = hot.countRows();
        const nextRow = Math.min(rowIndex, newRowCount - 1);
        if (nextRow >= 0) {
          hot.selectCell(nextRow, 0);
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setEntries]);

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "100%", gap: 1 }}
    >
      <Box sx={{ display: "flex", gap: 2, justifyContent: "end" }}>
        <Shortcut combo={["Ctrl", "Enter"]} hint="Add a new row" />
        <Shortcut combo={["Shift", "Backspace"]} hint="Remove the last row" />
      </Box>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <HotTable
          ref={hotRef}
          data={entries}
          width="100%"
          height="auto"
          colHeaders={["Work Item", "Time Spent", "Description"]}
          colWidths={[160, 120, null]}
          columns={[
            {
              data: "workItem",
              type: "autocomplete",
              source: [], // TODO: Dynamic list of suggestions, user managed
            },
            { data: "timeSpent", type: "text" },
            { data: "description", type: "text" },
          ]}
          stretchH="last"
          rowHeaders={true}
          manualRowMove={true}
          allowInsertColumn={false}
          allowRemoveColumn={false}
          sanitizer={(html: string) => DOMPurify.sanitize(html)}
          afterChange={(changes: CellChange[] | null, source: ChangeSource) => {
            if (!changes || source === "loadData") return;
            setEntries((prev) => {
              const next = [...prev];

              for (const [row, prop, , newValue] of changes) {
                next[row] = {
                  ...next[row],
                  [prop as keyof TimeEntry]: newValue,
                };
              }

              return next;
            });
          }}
          licenseKey="non-commercial-and-evaluation"
        />
      </Box>
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 1,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Total logged:
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {totalTime}
        </Typography>
      </Box>
    </Box>
  );
}
