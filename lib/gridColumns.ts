import type { ColumnSettings } from "handsontable";

export const WORK_ITEM_COLUMN_INDEX = 0;
export const TIME_SPENT_COLUMN_INDEX = 1;
export const NOTES_COLUMN_INDEX = 2;

export const COLUMN_TITLES = [
    "Work Item",
    "Time Spent",
    "Notes",
    "Description",
];

export const COLUMN_WIDTHS = [160, 120, 200, null];

/** Grid columns, with the work item column fed by the autocomplete source. */
export function buildColumns(autocompleteSource: string[]): ColumnSettings[] {
    return [
        {
            data: "workItem",
            type: "autocomplete",
            source: autocompleteSource,
            strict: false,
        },
        { data: "timeSpent", type: "text" },
        { data: "notes", type: "text" },
        { data: "description", type: "text" },
    ];
}
