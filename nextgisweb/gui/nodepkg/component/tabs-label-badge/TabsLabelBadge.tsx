import classNames from "classnames";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";
import { ErrorIcon } from "@nextgisweb/gui/icon";

import "./TabsLabelBadge.less";

export interface TabsLabelBadgeProps {
    error?: boolean;
    dirty?: boolean;
    counter?: number;

    children?: ReactNode;
}

export function TabsLabelBadge({
    dirty,
    counter,
    error,
    children,
}: TabsLabelBadgeProps) {
    const themeVariables = useThemeVariables({
        "theme-color-text": "colorTextLightSolid",
        "theme-color-dirty": "colorPrimary",
        "theme-color-clean": "colorTextTertiary",
        "theme-color-error": "colorError",
    });

    const badgeElement = useMemo(() => {
        if (error) {
            return (
                <span className={classNames("badge", "error")}>
                    <ErrorIcon />
                </span>
            );
        } else if (dirty !== undefined) {
            const dirtyCleanClassName = dirty ? "dirty" : "clean";
            if (typeof counter === "number" && counter > 0) {
                return (
                    <span
                        className={classNames(
                            "badge",
                            "countable",
                            dirtyCleanClassName,
                            { "long": counter > 9 }
                        )}
                        title={String(counter)}
                    >
                        {counter}
                    </span>
                );
            } else if (dirty) {
                return (
                    <span
                        className={classNames(
                            "badge",
                            "uncountable",
                            dirtyCleanClassName
                        )}
                    />
                );
            }
        }
    }, [counter, dirty, error]);

    return (
        <span className="ngw-gui-tabs-label-badge" style={themeVariables}>
            {children}
            {badgeElement}
        </span>
    );
}
