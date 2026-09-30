"use client";

import MuiTooltip, {
    TooltipProps,
    tooltipClasses,
} from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";

const StyledTooltip = styled(
    ({ className, slotProps, ...props }: TooltipProps) => {
        const popperSlot = slotProps?.popper;
        const popperProps =
            typeof popperSlot === "function" ? {} : popperSlot || {};

        return (
            <MuiTooltip
                {...props}
                classes={{ popper: className }}
                slotProps={{
                    ...slotProps,
                    popper: {
                        ...popperProps,
                        modifiers: [
                            {
                                name: "offset",
                                options: {
                                    offset: [0, -5],
                                },
                            },
                        ],
                    },
                }}
            />
        );
    },
)(() => ({
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: "#ffffff",
        color: "#404040",
        boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        fontSize: "0.75rem",
        fontWeight: 400,
        borderRadius: "0.375rem",
        border: "1px solid #e5e5e5",
        padding: "3px 8px",
    },
    [`.dark & .${tooltipClasses.tooltip}, [data-mui-color-scheme="dark"] & .${tooltipClasses.tooltip}`]:
        {
            backgroundColor: "#171717",
            color: "#e5e5e5",
            borderColor: "#262626",
            boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)",
        },
}));

export default function Tooltip(props: TooltipProps) {
    return <StyledTooltip arrow={false} placement="top" {...props} />;
}
