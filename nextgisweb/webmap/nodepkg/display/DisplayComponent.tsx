import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";

import { Layout, Spin, Splitter } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";
import { WebMapTabs } from "@nextgisweb/webmap/webmap-tabs";

import NavigationMenu from "../navigation-menu";
import type { MapRefs, TinyConfig } from "../type";

import { Display } from "./Display";
import { ActiveComponent } from "./component/ActiveComponent";
import { MapPane } from "./component/MapPane";

import { LoadingOutlined } from "@ant-design/icons";

import "./Display.css";

const { Content, Sider } = Layout;

export interface DisplayComponentProps {
    config: DisplayConfig;
    tinyConfig?: TinyConfig;
    className?: string;
    display?: Display;
    setMapRefs?: (val: MapRefs) => void;
}

export const DisplayComponent = observer(
    ({
        config,
        className = "",
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

        const { activePanel } = display.panelsManager;

        const [horizontalPanelSize, setHorizontalPanelSize] = useState<
            (number | undefined)[]
        >([350, undefined]);

        useEffect(() => {
            if (mapRefs) {
                display.startup(mapRefs);
            }
        }, [display, mapRefs]);

        return (
            <Layout
                style={{ width: "100%", height: "100%" }}
                className={className}
            >
                <Layout>
                    {display.panelsManager.panels.size > 0 && (
                        <Sider width={50}>
                            <NavigationMenu store={display.panelsManager} />
                        </Sider>
                    )}

                    <Content
                        className="map-container"
                        style={{ paddingLeft: 0 }}
                    >
                        <Splitter onResize={setHorizontalPanelSize}>
                            <Splitter.Panel
                                key="nav-panel"
                                size={activePanel ? horizontalPanelSize[0] : 0}
                                resizable={!!activePanel}
                            >
                                <ActiveComponent
                                    display={display}
                                    activePanel={activePanel}
                                />
                            </Splitter.Panel>
                            <Splitter.Panel>
                                <Splitter layout="vertical">
                                    <Splitter.Panel key="map">
                                        <MapPane setMapRefs={setMapRefs} />
                                    </Splitter.Panel>
                                    {display.tabsManager.tabs.length && (
                                        <Splitter.Panel key="map-bottom">
                                            <WebMapTabs
                                                store={display.tabsManager}
                                            />
                                        </Splitter.Panel>
                                    )}
                                </Splitter>
                            </Splitter.Panel>
                        </Splitter>
                    </Content>
                </Layout>
            </Layout>
        );
    }
);
DisplayComponent.displayName = "Display";

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
    return <DisplayComponent config={config} />;
}
