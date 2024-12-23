import { observer } from "mobx-react-lite";
import { Suspense, lazy, useMemo } from "react";
import type { ComponentType } from "react";

import { Tabs } from "@nextgisweb/gui/antd";
import type { TabsProps } from "@nextgisweb/gui/antd";

import type { PanelPlugin } from "../../panels-manager/registry";
import type { PanelComponentProps } from "../../panels-manager/type";
import type { Display } from "../Display";

import "./PanelSwitcher.css";

const PanelRender = observer(
    ({ panel, display }: { panel: PanelPlugin; display: Display }) => {
        const { load, meta } = panel;
        const Loader = lazy<ComponentType<PanelComponentProps>>(() =>
            load().then((mod) => ({
                default: mod,
            }))
        );

        const { closePanel } = display.panelsManager;

        return (
            <Suspense fallback={null}>
                <Loader display={display} close={closePanel} {...meta} />
            </Suspense>
        );
    }
);

PanelRender.displayName = "PanelRender";

export const PanelSwitcher = observer(({ display }: { display: Display }) => {
    const { panels, activePanel } = display.panelsManager;

    const activeKey = useMemo(
        () => (activePanel ? activePanel.meta.name : undefined),
        [activePanel]
    );

    const items = useMemo<TabsProps["items"]>(() => {
        return Array.from(panels.values()).map((panel) => {
            const item: NonNullable<TabsProps["items"]>[0] = {
                key: panel.name,
                label: panel.title,
                children: <PanelRender panel={panel} display={display} />,
            };
            return item;
        });
    }, [display, panels]);

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
