import classNames from "classnames";
import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";

import "./ContentCard.less";

export const ContentCard = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(({ className, style, children, ...restProps }, ref) => {
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
});

ContentCard.displayName = "ContentCard";
