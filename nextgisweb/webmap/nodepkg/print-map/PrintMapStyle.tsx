import { useMemo } from "react";

import type { PrintMapSettings } from "./type";
import { buildPrintStyle, mmToPx } from "./utils";

type PrintMapStyleProps = Pick<PrintMapSettings, "width" | "height" | "margin">;

export function PrintMapStyle({ width, height, margin }: PrintMapStyleProps) {
    const cssText = useMemo(() => {
        const widthPage = Math.round(mmToPx(width));
        const heightPage = Math.round(mmToPx(Number(height)));
        const m = Math.round(mmToPx(margin));
        const widthMap = widthPage - m * 2;
        const heightMap = heightPage - m * 2;

        return buildPrintStyle({
            widthPage,
            heightPage,
            margin: m,
            widthMap,
            heightMap,
        });
    }, [width, height, margin]);

    return <style>{cssText}</style>;
}
