import { observer } from "mobx-react-lite";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";

import { Layout, Splitter } from "@nextgisweb/gui/antd";
import { WebMapTabs } from "@nextgisweb/webmap/webmap-tabs";

import NavigationMenu from "../navigation-menu";
import type { PanelPlugin } from "../panels-manager/registry";
import type { PanelComponentProps } from "../panels-manager/type";
import type { DisplayConfig } from "../type";

import { Display } from "./Display";

import "./Display.css";

const { Content, Sider } = Layout;

const ActiveComponent = observer(
    ({
        activePanel,
        display,
    }: {
        activePanel?: PanelPlugin;
        display: Display;
    }) => {
        if (activePanel) {
            const { load, meta } = activePanel;

            const Loader = lazy<ComponentType<PanelComponentProps>>(() =>
                load().then((mod) => ({
                    default: mod,
                }))
            );

            return (
                <Suspense key={meta.name + meta.key}>
                    <Loader
                        display={display}
                        close={() => {
                            display.panelsManager.closePanel();
                        }}
                        {...meta}
                    />
                </Suspense>
            );
        }
    }
);
ActiveComponent.displayName = "ActiveComponent";

export const DisplayComponent = observer(
    ({ config }: { config: DisplayConfig }) => {
        const mapRef = useRef<HTMLDivElement>(null);
        const [display] = useState<Display>(
            () =>
                new Display({
                    config,
                })
        );
        const { activePanel } = display.panelsManager;

        const leftTopControlPaneRef = useRef<HTMLDivElement>(null);
        const leftBottomControlPaneRef = useRef<HTMLDivElement>(null);
        const rightTopControlPaneRef = useRef<HTMLDivElement>(null);
        const rightBottomControlPaneRef = useRef<HTMLDivElement>(null);

        const [horizontalPanelSize, setHorizontalPanelSize] = useState<
            (number | undefined)[]
        >([350, undefined]);

        useEffect(() => {
            if (
                mapRef.current &&
                leftTopControlPaneRef.current &&
                leftBottomControlPaneRef.current &&
                rightTopControlPaneRef.current &&
                rightBottomControlPaneRef.current
            ) {
                display.startup({
                    target: mapRef.current,
                    leftTopControlPane: leftTopControlPaneRef.current,
                    leftBottomControlPane: leftBottomControlPaneRef.current,
                    rightTopControlPane: rightTopControlPaneRef.current,
                    rightBottomControlPane: rightBottomControlPaneRef.current,
                });
            }
        }, [config, config.extent_const, display]);

        return (
            <Layout style={{ width: "100%", height: "100%" }}>
                <Layout>
                    {display?.panelsManager && (
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
                                        <div
                                            className="map-pane"
                                            style={{
                                                width: "100%",
                                                padding: 0,
                                            }}
                                        >
                                            <div
                                                className="map-node"
                                                ref={mapRef}
                                                style={{
                                                    position: "absolute",
                                                    width: "100%",
                                                    height: "100%",
                                                    padding: 0,
                                                }}
                                            >
                                                <div
                                                    ref={leftTopControlPaneRef}
                                                    className="control-pane control-pane--top control-pane--left"
                                                />
                                                <div
                                                    ref={
                                                        leftBottomControlPaneRef
                                                    }
                                                    className="control-pane control-pane--bottom control-pane--left"
                                                />
                                                <div
                                                    ref={rightTopControlPaneRef}
                                                    className="control-pane control-pane--top control-pane--right"
                                                />
                                                <div
                                                    ref={
                                                        rightBottomControlPaneRef
                                                    }
                                                    className="control-pane control-pane--bottom control-pane--right"
                                                />
                                            </div>
                                        </div>
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
