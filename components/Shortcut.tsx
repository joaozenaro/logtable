import { Box, Typography } from "@mui/material";
import { Fragment } from "react/jsx-runtime";

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <Box
    component="kbd"
    sx={{
      px: 0.75,
      py: 0.25,
      borderRadius: 1,
      border: 1,
      borderColor: "divider",
      bgcolor: "background.paper",
      color: "text.primary",
      typography: "caption",
      fontFamily: "monospace",
      fontWeight: 600,
      lineHeight: 1.5,
      boxShadow: (theme) => theme.shadows[1],
      userSelect: "none",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </Box>
);

type ShortcutProps = {
  combo: string[];
  hint: string;
};

export default function Shortcut({ combo, hint }: ShortcutProps) {
  return (
    <Typography variant="body2">
      {combo.map((key, index) => (
        <Fragment key={key}>
          {index > 0 && " + "}
          <Kbd>{key}</Kbd>
        </Fragment>
      ))}
      : {hint}
    </Typography>
  );
}
