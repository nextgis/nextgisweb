import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";

import { Spin, Splitter } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";
import { WebMapTabs } from "@nextgisweb/webmap/webmap-tabs";

import type { MapRefs, TinyConfig } from "../type";

import { Display } from "./Display";
import { MapPane } from "./component/MapPane";
import { NavigationMenu } from "./component/NavigationMenu";
import { PanelSwitcher } from "./component/PanelSwitcher";

import { LoadingOutlined } from "@ant-design/icons";

import "./DisplayWidget.css";
import "./DisplayWidget.less";

const { Panel } = Splitter;

export interface DisplayComponentProps {
    config: DisplayConfig;
    tinyConfig?: TinyConfig;
    className?: string;
    display?: Display;
    setMapRefs?: (val: MapRefs) => void;
}

export const DisplayWidget = observer(
    ({
        config,
        className,
        display: displayProp,
        setMapRefs: setMapRefsProp,
    }: DisplayComponentProps) => {
        const [display] = useState<Display>(
            () =>
                displayProp ||
                new Display({
                    config,
                })
        );

        const [mapRefs, setMapRefs_] = useState<MapRefs>();

        const setMapRefs = useCallback(
            (mapRefs_: MapRefs) => {
                setMapRefs_(mapRefs_);
                if (setMapRefsProp) {
                    setMapRefsProp(mapRefs_);
                }
            },
            [setMapRefsProp]
        );

        const { activePanel } = display.panelManager;

        const [horizontalPanelSize, setHorizontalPanelSize] = useState<
            (number | undefined)[]
        >([350, undefined]);

        useEffect(() => {
            if (mapRefs) {
                display.startup(mapRefs);
            }
        }, [display, mapRefs]);

        return (
            <Splitter
                className={classNames("ngw-webmap-display", className)}
                onResize={setHorizontalPanelSize}
            >
                {display.panelManager.panels.size > 0 && (
                    <Panel
                        key="menu"
                        resizable={false}
                        size="50px"
                        style={{ flexGrow: 0, flexShrink: 0 }}
                    >
                        <NavigationMenu store={display.panelManager} />
                    </Panel>
                )}
                <Panel
                    key="panels"
                    size={activePanel ? horizontalPanelSize[0] : 0}
                    resizable={!!activePanel}
                >
                    <PanelSwitcher display={display} />
                </Panel>
                <Panel key="main">
                    <Splitter layout="vertical">
                        <Panel key="map">
                            <MapPane setMapRefs={setMapRefs} />
                        </Panel>
                        {display.tabsManager.tabs.length && (
                            <Panel key="tabs">
                                <WebMapTabs store={display.tabsManager} />
                            </Panel>
                        )}
                    </Splitter>
                </Panel>
            </Splitter>
        );
    }
);
DisplayWidget.displayName = "Display";

export function DisplayLoader({ id }: { id: number }) {
    const { data: config, isLoading } = useRouteGet("webmap.display_config", {
        id,
    });

    if (isLoading || !config) {
        return (
            <Spin
                indicator={<LoadingOutlined spin />}
                size="large"
                fullscreen
            />
        );
    }
    return <DisplayWidget config={config} />;
}
