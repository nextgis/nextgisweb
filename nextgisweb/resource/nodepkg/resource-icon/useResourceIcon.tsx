import { useCallback, useMemo } from "react";
import type React from "react";

import { routeURL } from "@nextgisweb/pyramid/api";

import type { ResourceAttrItem } from "../api/ResourceAttrItem";
import { ResourceIcon } from "../icon";

import { registry } from "./registry";
import type { ResourceIconRegItem } from "./registry";

export function useResourceIcon() {
    const regItems = useMemo<ResourceIconRegItem[]>(() => {
        return registry.queryAll();
    }, []);

    const attributes = useMemo(
        () => [...new Set(regItems.map((it) => it.attributes ?? []).flat())],
        [regItems]
    );

    const getIcon = useCallback(
        ({
            item,
            children,
        }: {
            item: ResourceAttrItem;
            children?: React.ReactNode;
        }) => {
            const cls = item.get("resource.cls");
            const href = routeURL("resource.show", item.id);
            const resIconPlugin = regItems.find((r) => r.cls === cls);
            let icon: React.ReactNode;
            const PluginIcon = resIconPlugin?.icon;
            if (PluginIcon) {
                icon = <PluginIcon item={item}>{children}</PluginIcon>;
            } else {
                icon = <ResourceIcon identity={cls}>{children}</ResourceIcon>;
            }

            return (
                <a href={href}>
                    {icon}
                    {children}
                </a>
            );
        },
        [regItems]
    );

    return { attributes, getIcon };
}
