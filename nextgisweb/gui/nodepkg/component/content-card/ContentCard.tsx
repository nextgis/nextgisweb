import classNames from "classnames";
import type { ComponentPropsWithRef } from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";

import "./ContentCard.less";

export function ContentCard({
    className,
    style,
    children,
    ref,
    ...restProps
}: ComponentPropsWithRef<"div">) {
    const themeVariables = useThemeVariables({
        "theme-color-border-secondary": "colorBorderSecondary",
        "theme-border-radius": "borderRadius",
        "theme-padding": "padding",
    });

    return (
        <div
            ref={ref}
            className={classNames("ngw-gui-content-card", className)}
            style={{ ...themeVariables, ...(style ?? {}) }}
            {...restProps}
        >
            {children}
        </div>
    );
}
