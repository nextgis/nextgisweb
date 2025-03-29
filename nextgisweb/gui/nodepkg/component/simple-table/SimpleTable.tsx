import classNames from "classnames";
import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";

import "./SimpleTable.less";

export const SimpleTable = forwardRef<
    HTMLTableElement,
    HTMLAttributes<HTMLTableElement>
>(({ className, style, children, ...rest }, ref) => {
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
});

SimpleTable.displayName = "SimpleTable";
