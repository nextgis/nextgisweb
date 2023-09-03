import { useMemo, lazy, Suspense } from "react";
import { observer } from "mobx-react-lite";

import { Tabs } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { WebMapTabsStore } from "./WebMapTabsStore";

import type { ParamOf } from "@nextgisweb/gui/type";

type TabItems = NonNullable<ParamOf<typeof Tabs, "items">>;

interface WebMapTabsProps {
    store: WebMapTabsStore;
}

const msgLoading = gettext("Loading");

export const WebMapTabs = observer(({ store }: WebMapTabsProps) => {
    const { activeKey, setActiveKey, removeTab } = store;

    const items = useMemo(() => {
        if (store.tabs.length) {
            const tabs: TabItems = [];
            for (const { component, props, ...rest } of store.tabs) {
                const tab: TabItems[0] = {
                    closable: true,
                    ...rest,
                };
                if (component) {
                    const ChildrenComponent = lazy(() => component());
                    Object.assign(tab, {
                        children: (
                            <Suspense fallback={msgLoading}>
                                <ChildrenComponent {...props} />
                            </Suspense>
                        ),
                    });
                }
                tabs.push(tab);
            }
            return tabs;
        }
        return [];
    }, [store.tabs]);

    if (!items.length) {
        return <></>;
    }

    return (
        <Tabs
            type="editable-card"
            hideAdd
            items={items}
            activeKey={activeKey || undefined}
            onChange={setActiveKey}
            onEdit={(targetKey, action) => {
                if (action === "remove") {
                    removeTab(String(targetKey));
                }
            }}
            parentHeight
        />
    );
});