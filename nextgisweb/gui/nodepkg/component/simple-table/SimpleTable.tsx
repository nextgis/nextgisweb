import classNames from "classnames";
import type { HTMLAttributes, Ref } from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";

import "./SimpleTable.less";

export interface SimpleTableProps extends HTMLAttributes<HTMLTableElement> {
    ref?: Ref<HTMLTableElement>;
}

export function SimpleTable({
    ref,
    className,
    style,
    children,
    ...rest
}: SimpleTableProps) {
    const themeVariables = useThemeVariables({
        "theme-color-border-secondary": "colorBorderSecondary",
        "theme-border-radius": "borderRadius",
    });

    return (
        <table
            ref={ref}
            className={classNames("ngw-gui-simple-table", className)}
            style={{ ...themeVariables, ...(style ?? {}) }}
            {...rest}
        >
            {children}
        </table>
    );
}
