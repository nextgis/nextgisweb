import classNames from "classnames";
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
    children,
    align,
    style,
    gap,
    ...rest
}: MapToolbarControlProps) {
    const calcStyle = useMemo<React.CSSProperties>(
        () => ({
            ...style,
            display: "flex",
            flexDirection: direction === "horizontal" ? "row" : "column",
            alignItems: align,
            ...(gap !== undefined
                ? { gap: typeof gap === "number" ? `${gap}px` : gap }
                : {}),
        }),
        [align, direction, style, gap]
    );

    return (
        <MapControl
            {...rest}
            style={calcStyle}
            className={classNames({ dense: gap === 0 || gap === "0px" })}
        >
            {children}
        </MapControl>
    );
}
