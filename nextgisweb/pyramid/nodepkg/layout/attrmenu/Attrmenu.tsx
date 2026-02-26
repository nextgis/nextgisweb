import { useEffect, useMemo, useState } from "react";

import { CentralLoading } from "@nextgisweb/gui/component";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import type { Attributes } from "@nextgisweb/resource/api/resource-attr";
import { useResourceAttr } from "@nextgisweb/resource/hook/useResourceAttr";
import { DefaultResourceSectionAttrs } from "@nextgisweb/resource/resource-section";
import type { DefaultResourceAttrItem } from "@nextgisweb/resource/resource-section";
import {
    getResourceActionGroup,
    registry,
    resourceActionGroups,
} from "@nextgisweb/resource/resource-section/registry";
import type {
    ResourceAction,
    ResourceActionGroupId,
} from "@nextgisweb/resource/resource-section/registry";

import "../dynmenu/Dynmenu.less";
import { Dynmenu } from "../dynmenu/Dynmenu";
import type { CustomDynMenuItem } from "../dynmenu/Dynmenu";

interface DynmenuProps {
    resourceId: number;
}

function byOrder(a: ResourceAction, b: ResourceAction) {
    const ao = a.order ?? 0;
    const bo = b.order ?? 0;
    return ao - bo;
}

function getHref(
    href: NonNullable<ResourceAction["href"]>,
    item: DefaultResourceAttrItem
) {
    return typeof href === "function" ? href(item) : href;
}

export function Attrmenu({ resourceId }: DynmenuProps) {
    const [isDataLoading, setIsDataLoading] = useState(true);
    const { fetchResourceItems } = useResourceAttr();

    const [reg] = useState(() => registry.queryAll());

    const { makeSignal } = useAbortController();

    const [item, setItem] = useState<DefaultResourceAttrItem>();

    useEffect(() => {
        (async () => {
            setIsDataLoading(true);
            try {
                const attrs: [...Attributes] = [];
                for (const { attributes } of reg) {
                    if (attributes) {
                        attrs.push(...attributes);
                    }
                }
                const items = (await fetchResourceItems({
                    resources: [resourceId],
                    attributes: [...DefaultResourceSectionAttrs, ...attrs],
                })) as DefaultResourceAttrItem[];
                if (items[0]) {
                    setItem(items[0]);
                }
            } finally {
                setIsDataLoading(false);
            }
        })();
    }, [fetchResourceItems, makeSignal, reg, resourceId]);

    const items = useMemo((): CustomDynMenuItem[] => {
        if (!item) return [];

        const map = new Map<ResourceActionGroupId, ResourceAction[]>();

        for (const a of reg) {
            if (a.condition && !a.condition(item)) continue;
            if (!a.href) continue;

            const g = a.group;
            if (!g) continue;

            const arr = map.get(g) ?? [];
            arr.push(a);
            map.set(g, arr);
        }

        const out: CustomDynMenuItem[] = [];

        const groups = resourceActionGroups();

        for (const { key: g, label } of groups) {
            const arr = (map.get(g) ?? []).slice().sort(byOrder);
            if (!arr.length) continue;

            out.push({
                type: "label",
                label: label ?? getResourceActionGroup(g)?.label ?? g,
                key: [],
            });

            for (const a of arr) {
                if (!a.href) continue;
                const href = getHref(a.href, item);

                out.push({
                    type: "link",
                    key: [],
                    label: a.label ?? a.key,
                    url: href,
                    target: a.target ?? "_self",
                    selected: location.href.includes(href),
                    icon_suffix: a.icon_suffix,
                    icon: a.icon ?? null,
                });
            }
        }

        return out;
    }, [item, reg]);

    if (isDataLoading) {
        return <CentralLoading />;
    }
    if (!item) {
        return null;
    }

    return <Dynmenu items={items} />;
}
