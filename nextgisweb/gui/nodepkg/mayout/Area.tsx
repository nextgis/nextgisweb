import classNames from "classnames";
import { createContext } from "react";
import type { CSSProperties, ReactNode } from "react";

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
    /** Label position, left or top */
    labelPosition?: LabelPosition;

    /** Number of columns or array of their widths */
    cols?: number | string[];

    /** Width of label columns */
    labelColumn?: string;

    /** Add default padding around component */
    pad?: boolean;

    /** Root class name */
    rootClassName?: string;

    /** Additional style */
    style?: CSSProperties;

    /** Usually Lot components */
    children?: ReactNode;
}

export function Area({
    labelPosition = "left",
    cols = 1,
    labelColumn = "fit-content(25%)",
    pad = false,
    rootClassName,
    style,
    children,
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
                className={classNames(
                    "ngw-gui-mayout-area",
                    `label-${labelPosition}`,
                    { "pad": pad },
                    rootClassName
                )}
                style={{ gridTemplateColumns, ...style }}
            >
                {children}
            </div>
        </AreaContext.Provider>
    );
}
