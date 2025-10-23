import classNames from "classnames";
import { useMemo } from "react";
import type React from "react";

import { MapControl } from "./MapControl";
import type { MapControlProps } from "./MapControl";
import {
    MapToolbarControlContext,
    useMapToolbarControl,
} from "./MapToolbarControlContext";

type Direction = "horizontal" | "vertical";

interface MapToolbarControlProps extends MapControlProps {
    direction?: Direction;
    gap?: number | string;
    align?: React.CSSProperties["alignItems"];
}

export default function MapToolbarControl({
    direction = "horizontal",
    position,
    children,
    align,
    style,
    gap,
    ...rest
}: MapToolbarControlProps) {
    const toolbarContext = useMapToolbarControl();

    position = position || toolbarContext?.position;

    const calcStyle = useMemo<React.CSSProperties>(() => {
        const isRight =
            typeof position === "string" && position.includes("right");
        const isRightToLeft = direction === "horizontal" && isRight;

        return {
            ...style,
            display: "flex",
            flexDirection:
                direction === "horizontal"
                    ? isRightToLeft
                        ? "row-reverse"
                        : "row"
                    : "column",
            alignItems: (align ?? isRight) ? "end" : undefined,
            ...(gap !== undefined
                ? { gap: typeof gap === "number" ? `${gap}px` : gap }
                : {}),
        };
    }, [align, direction, style, gap, position]);

    return (
        <MapToolbarControlContext value={{ position, direction }}>
            <MapControl
                {...rest}
                style={calcStyle}
                className={classNames({ dense: gap === 0 || gap === "0px" })}
                position={position}
            >
                {children}
            </MapControl>
        </MapToolbarControlContext>
    );
}
