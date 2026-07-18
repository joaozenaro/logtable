'use client';

import {
    CopyPaste,
    ManualRowMove,
    registerPlugin,
    StretchColumns,
    UndoRedo,
} from 'handsontable/plugins';

import {
    AutocompleteCellType,
    registerCellType,
    TextCellType,
} from 'handsontable/cellTypes';
import { HotTable, HotTableRef } from '@handsontable/react-wrapper';

import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import { useEffect, useRef, useState } from 'react';
import { AutocompleteEditor, registerEditor } from 'handsontable/editors';
import { autocompleteRenderer, registerRenderer } from 'handsontable/renderers';
import { autocompleteValidator, registerValidator } from 'handsontable/validators';
import { CellChange, ChangeSource } from 'handsontable';
import { calculateTotal } from '@/lib/time';

registerCellType(TextCellType);
registerCellType(AutocompleteCellType);

registerEditor(AutocompleteEditor);
registerRenderer(autocompleteRenderer);
registerValidator(autocompleteValidator);

registerPlugin(CopyPaste);
registerPlugin(ManualRowMove);
registerPlugin(StretchColumns);
registerPlugin(UndoRedo);

export default function Grid() {
    const hotRef = useRef<HotTableRef>(null);
    const [timeSpent, setTimeSpent] = useState<string>("00h00m");

    useEffect(() => {
        const hot = hotRef.current?.hotInstance;
        if (!hot) return;

        const shortcutManager = hot.getShortcutManager();
        const gridContext = shortcutManager.getContext('grid')!;

        gridContext.addShortcuts([
            {
                keys: [['Control', 'Enter']],
                group: 'customActions',
                callback: (event) => {
                    event.preventDefault();
                    const newRowIndex = hot.countRows();
                    hot.alter("insert_row_below", newRowIndex - 1, 1);
                    hot.selectCell(newRowIndex, 0);
                },
            },
            {
                keys: [['Shift', 'Backspace']],
                group: 'customActions',
                callback: (event) => {
                    event.preventDefault();

                    const selected = hot.getSelectedRangeLast();
                    if (!selected) return;

                    const rowIndex = selected.from.row ?? 0;
                    if (rowIndex > 0) hot.alter("remove_row", rowIndex, 1);

                    const newRowCount = hot.countRows();
                    const nextRow = Math.min(rowIndex, newRowCount - 1);

                    if (nextRow >= 0) {
                        hot.selectCell(nextRow, 0);
                    }
                },
            }
        ]);
    }, [hotRef]);

    return (
        <div>
            <HotTable
                className='ht-theme-main-dark-auto'
                ref={hotRef}
                width="100%"
                height="auto"
                autoWrapRow={true}
                autoWrapCol={true}
                startRows="10"
                colHeaders={["Work Item", "Time Spent", "Description"]}
                colWidths={[160, 120, null]}
                columns={[
                    {
                        data: "workItem",
                        type: "autocomplete",
                        source: ["au-1"],
                        strict: false
                    },
                    { data: "timeSpent", type: "text" },
                    { data: "description", type: "text" },
                ]}
                stretchH="last"
                rowHeaders={true}
                manualRowMove={true}
                imeFastEdit={true}
                afterChange={(changes: CellChange[], source: ChangeSource) => {
                    if (!changes || source === 'loadData') {
                        return;
                    }

                    const total = calculateTotal(hotRef.current?.hotInstance?.getDataAtCol(1) as string[]);
                    setTimeSpent(total);
                }}
                licenseKey="non-commercial-and-evaluation"
            />
            <div className='flex justify-end'>
                <span className=''>
                    Total: {timeSpent}
                </span>
            </div>
        </div>
    );
}
