import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { HotTable } from "@handsontable/react-wrapper";
import type { HotTableRef } from "@handsontable/react-wrapper";
import { registerCellType, TextCellType } from "handsontable/cellTypes";
import { CopyPaste, StretchColumns } from "handsontable/plugins";
import { ManualRowMove } from "handsontable/plugins/manualRowMove";
import { registerPlugin } from "handsontable/plugins/registry";

registerCellType(TextCellType);
registerPlugin(ManualRowMove);
registerPlugin(StretchColumns);
registerPlugin(CopyPaste);

const data = [["XX", "0h00m", "Description"]];

export default function Table() {
  const hotRef = useRef<HotTableRef>(null);
  const [timeSpent, setTimeSpent] = useState<string>();

  const sumTime = () => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    const values = hot.getDataAtCol(1) as string[];

    const sum = values.reduce((total: number, value: string) => {
      const match = value.match(/^(?:(?<hours>\d+)h)?(?:(?<minutes>\d+)m)?$/);

      if (!match?.groups) return total;

      const hours = Number(match.groups.hours ?? 0);
      const minutes = Number(match.groups.minutes ?? 0);

      return total + hours * 60 + minutes;
    }, 0);

    const totalHours = Math.floor(sum / 60);
    const remainingMinutes = sum % 60;

    setTimeSpent(`${totalHours}h${remainingMinutes}m`);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const hot = hotRef.current?.hotInstance;
      if (!hot) return;

      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        const newRowIndex = hot.countRows();
        hot.alter("insert_row_below", newRowIndex - 1, 1);
        hot.selectCell(newRowIndex, 0);
      } else if (e.ctrlKey && e.key === "Backspace") {
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
  }, []);

  return (
    <div>
      <span>Total: {timeSpent}</span>
      <HotTable
        ref={hotRef}
        data={data}
        width="100%"
        colWidths={[150, 150, null]}
        height="auto"
        stretchH="last"
        colHeaders={["Work item key", "Time spent", "Description"]}
        rowHeaders={true}
        manualRowMove={true}
        allowInsertColumn={false}
        allowRemoveColumn={false}
        sanitizer={(html: string) => DOMPurify.sanitize(html)}
        afterChange={(changes: number[][], source: string) => {
          if (source === "loadData") sumTime();
          if (!changes) return;
          if (changes?.[0]?.[1] == 1) sumTime();
        }}
        licenseKey="non-commercial-and-evaluation"
      />
    </div>
  );
}
