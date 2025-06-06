import { useEffect, useState } from "react";

import { Dynmenu } from "@nextgisweb/pyramid/layout";
import type { DynMenuItem } from "@nextgisweb/pyramid/layout/dynmenu/type";

import { registry as testentries } from "./registry";

export function TestEntries() {
    const [items, setItems] = useState<DynMenuItem[]>([]);

    useEffect(() => {
        const newItems: DynMenuItem[] = [];
        let prefix;
        for (const p of testentries.query()) {
            const parts = p.identity.split("/");
            const cprefix = parts.slice(0, 2).join("/");
            const crest = parts.slice(2).join("/");
            if (prefix !== cprefix) {
                newItems.push({
                    type: "label",
                    label: cprefix,
                    key: [],
                });
                prefix = cprefix;
            }
            newItems.push({
                type: "link",
                label: crest,
                key: [],
                url: `/testentry/${p.identity}`,
                icon: null,
                icon_suffix: null,
                selected: false,
                target: '"_self"',
            });
        }
        setItems(newItems);
    }, []);

    return <Dynmenu items={items} />;
}
