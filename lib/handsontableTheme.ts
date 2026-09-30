import { mainTheme, registerTheme } from "handsontable/themes";

/**
 * Shared Handsontable theme. Imported by every Handsontable-based component so
 * they all render with the same tokens and color scheme.
 */
export const handsontableTheme =
    registerTheme(mainTheme).setColorScheme("auto");
