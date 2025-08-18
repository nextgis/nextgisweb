import { useMemo } from "react";
import type React from "react";

import { MapControl } from "./MapControl";
import type { MapControlProps } from "./MapControl";

type Direction = "horizontal" | "vertical";

interface MapToolbarControlProps extends MapControlProps {
    direction?: Direction;
    gap?: number | string;
    align?: React.CSSProperties["alignItems"];
}

export default function MapToolbarControl({
    direction = "horizontal",
    align = "center",
    gap,
    ...rest
}: MapToolbarControlProps) {
    const style = useMemo<Partial<CSSStyleDeclaration>>(
        () => ({
            display: "flex",
            flexDirection: direction === "horizontal" ? "row" : "column",
            alignItems: align,
            ...(gap !== undefined
                ? { gap: typeof gap === "number" ? `${gap}px` : gap }
                : {}),
        }),
        [align, direction, gap]
    );

    return <MapControl {...rest} targetStyle={style}></MapControl>;
}
