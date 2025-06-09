import { Grid } from "antd";

const { useBreakpoint } = Grid;

export type Orientation = "portrait" | "landscape";

export function useLayout() {
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const orientation: Orientation = isMobile ? "portrait" : "landscape";

    return {
        isMobile,
        orientation,
        isPortrait: orientation === "portrait",
        isLandscape: orientation === "landscape",
    };
}
