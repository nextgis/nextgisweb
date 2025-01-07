import classNames from "classnames";
import type { PropsWithChildren, ReactNode } from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";
import "./PanelSection.less";

export interface PanelSectionProps extends PropsWithChildren {
    icon?: ReactNode;
    title?: ReactNode;
    suffix?: ReactNode;
}

export function PanelSection({
    icon,
    title,
    suffix,
    children,
}: PanelSectionProps) {
    const themeVariables = useThemeVariables({
        "theme-color-primary": "colorPrimary",
        "theme-color-text-tertiary": "colorTextTertiary",
    });

    return (
        <section className="ngw-webmap-panel-section" style={themeVariables}>
            {title && (
                <div className={classNames("title")}>
                    <div className="icon">{icon}</div>
                    <div className="content">{title}</div>
                    <div className="suffix">{suffix}</div>
                </div>
            )}
            <div className="content">{children}</div>
        </section>
    );
}
