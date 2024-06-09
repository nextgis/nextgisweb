import { createContext } from "react";
import type { CSSProperties, ReactNode } from "react";

import { mergeClasses } from "@nextgisweb/gui/util";

import "./Area.less";

export type LabelPosition = "left" | "top";

interface AreaContextProps {
    labelPosition: LabelPosition;
    columnCount: number;
}

export const AreaContext = createContext<AreaContextProps>({
    labelPosition: "left",
    columnCount: 1,
});

export interface AreaProps {
    labelPosition?: LabelPosition;
    cols?: number | string[];
    labelColumn?: string;
    pad?: boolean;
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
}

export function Area({
    labelPosition = "left",
    cols = 1,
    labelColumn = "fit-content(25%)",
    pad = false,
    children,
    className,
    style,
}: AreaProps) {
    if (typeof cols === "number")
        cols = new Array(cols).fill("minmax(4em, auto)");

    const gridColumns: string[] = [];
    if (labelPosition === "left") {
        cols.forEach((c) => {
            gridColumns.push(labelColumn, c);
        });
    } else if (labelPosition === "top") {
        gridColumns.push(...cols);
    }
    const gridTemplateColumns = gridColumns.join(" ");

    const ctx = { labelPosition, columnCount: cols.length };
    return (
        <AreaContext.Provider value={ctx}>
            <div
                className={mergeClasses(
                    "ngw-gui-mayout-area",
                    `label-${labelPosition}`,
                    pad && "pad",
                    className
                )}
                style={{ gridTemplateColumns, ...style }}
            >
                {children}
            </div>
        </AreaContext.Provider>
    );
}
