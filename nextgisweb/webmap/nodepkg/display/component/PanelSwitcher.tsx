import { observer } from "mobx-react-lite";
import { Suspense, lazy, useMemo } from "react";

import { Tabs } from "@nextgisweb/gui/antd";
import type { TabsProps } from "@nextgisweb/gui/antd";
import type { PanelStore } from "@nextgisweb/webmap/panel";

import type { Display } from "../Display";

import "./PanelSwitcher.css";

const PanelRender = observer(({ panel }: { panel: PanelStore }) => {
    const Loader = useMemo(() => {
        return lazy(async () => {
            return { default: await panel.load() };
        });
    }, [panel]);

    return (
        <Suspense fallback={null}>
            <Loader store={panel} display={panel.display} />
        </Suspense>
    );
});

PanelRender.displayName = "PanelRender";

export const PanelSwitcher = observer(({ display }: { display: Display }) => {
    const { panels, activePanel } = display.panelManager;

    const activeKey = useMemo(
        () => (activePanel ? activePanel.name : undefined),
        [activePanel]
    );

    const items = useMemo<TabsProps["items"]>(() => {
        return Array.from(panels.values()).map((panel) => {
            const item: NonNullable<TabsProps["items"]>[0] = {
                key: panel.name,
                label: panel.title,
                children: <PanelRender panel={panel} />,
            };
            return item;
        });
    }, [panels]);

    return (
        <Tabs
            className="panel-switcher"
            activeKey={activeKey}
            items={items}
            renderTabBar={() => <></>}
            style={{ height: "100%", width: "100%" }}
        />
    );
});

PanelSwitcher.displayName = "PanelSwitcher";
