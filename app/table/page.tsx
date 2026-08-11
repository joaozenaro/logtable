"use client";

import { db, TimeRow } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { DataGrid, GridColDef, GridSlotsComponentsProps } from "@mui/x-data-grid";
import { useState } from "react";
import { calculateTotal } from "@/lib/time";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";

interface DateFilter {
    start: string;
    end: string;
}

declare module '@mui/x-data-grid' {
    interface FooterPropsOverrides {
        times: string[]
    }
}

function FooterTotalSum(props: NonNullable<GridSlotsComponentsProps['footer']>) {
    const total = calculateTotal(props.times ?? []);

    return (
        <div className="p-4 flex justify-end items-center border-t border-divider">
            <span className="text-sm font-medium text-mui-text-secondary mr-3">
                Total Time:
            </span>
            <span className="text-lg font-bold text-mui-primary">
                {total}
            </span>
        </div>
    );
}

export default function Table() {
    const [filterDates, setFilterDates] = useState<DateFilter>({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });

    const logs = useLiveQuery(
        () =>
            db.rows
                .where("date")
                .between(
                    filterDates.start,
                    filterDates.end,
                    true,
                    true
                )
                .toArray(),
        [filterDates.start, filterDates.end]
    );

    const columns: GridColDef<TimeRow>[] = [
        {
            field: "date",
            headerName: "Date",
            width: 130,
        },
        {
            field: "workItem",
            headerName: "Work Item",
            width: 250,
        },
        {
            field: "description",
            headerName: "Description",
            flex: 1,
            minWidth: 300,
        },
        {
            field: "timeSpent",
            headerName: "Time Spent",
            width: 150,
            align: 'right',
            headerAlign: 'right',
        },
    ];

    if (!logs) {
        return null;
    }

    return (
        <div className="flex flex-col h-full items-center px-4">
            <div className="w-full max-w-6xl flex flex-col h-full pt-8 pb-12">
                <div className="flex items-center justify-between gap-4 mb-6 shrink-0">
                    <h1 className="text-2xl font-bold">
                        Work Logs
                    </h1>
                    <div className="flex items-center gap-4">
                        <DatePicker
                            label="Start Date"
                            value={dayjs(filterDates.start)}
                            onChange={(e) => setFilterDates(prev => ({ start: dayjs(e).format("YYYY-MM-DD"), end: prev.end }))}
                            slotProps={{ textField: { size: 'small' } }}
                        />
                        <DatePicker
                            label="End Date"
                            value={dayjs(filterDates.end)}
                            onChange={(e) => setFilterDates(prev => ({ start: prev.start, end: dayjs(e).format("YYYY-MM-DD") }))}
                            slotProps={{ textField: { size: 'small' } }}
                        />
                    </div>
                </div>
                <div className="flex-1 min-h-0 border border-divider flex flex-col">
                    <DataGrid
                        rows={logs}
                        columns={columns}
                        getRowId={(row) => row.id!}
                        slots={{
                            footer: FooterTotalSum,
                        }}
                        slotProps={{
                            footer: { times: logs.map(x => x.timeSpent) },
                        }}
                        sx={{ border: 0 }}
                        disableRowSelectionOnClick
                    />
                </div>
            </div>
        </div>
    );
}