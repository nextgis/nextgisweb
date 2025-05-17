import { useState } from "react";
import type React from "react";

import { MenuItem } from "../MenuItem";

import type { HeaderProps } from "./Header";
import { registry } from "./registry";

export function HeaderComponents(props: HeaderProps) {
    const [headerComponents] = useState(() => {
        const plugins = Array.from(registry.query({ menuItem: false })).sort(
            (a, b) => (b.order ?? 0) - (a.order ?? 0)
        );
        const pluginMenuItems: React.ReactNode[] = [];
        let index = 0;
        for (const { component, props: componentProps, isEnabled } of plugins) {
            if (isEnabled && !isEnabled(props)) {
                continue;
            }
            pluginMenuItems.push(
                <MenuItem
                    key={index++}
                    item={component}
                    props={componentProps}
                />
            );
        }
        return pluginMenuItems;
    });

    return <>{headerComponents}</>;
}
