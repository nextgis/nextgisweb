import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";

import { Splitter } from "@nextgisweb/gui/antd";
import { useLayout } from "@nextgisweb/pyramid/layout/useLayout";
import type { Orientation } from "@nextgisweb/pyramid/layout/useLayout";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";
import { WebMapTabs } from "@nextgisweb/webmap/webmap-tabs";

import type { MapRefs, TinyConfig } from "../type";

import { Display } from "./Display";
import { MapPane } from "./component/MapPane";
import { NavigationMenu } from "./component/NavigationMenu";
import { PanelSwitcher } from "./component/PanelSwitcher";

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

const PANEL_MIN_HEIGHT = 20;
const PANELS_DEF_LANDSCAPE_SIZE = 350;
const PANELS_DEF_PORTRAIT_SIZE = "50%";

function getDefultPanelSize(orientation: Orientation) {
    return orientation === "portrait"
        ? PANELS_DEF_PORTRAIT_SIZE
        : PANELS_DEF_LANDSCAPE_SIZE;
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

        const { orientation, isPortrait, isMobile } = useLayout();

        useEffect(() => {
            display.setIsMobile(isMobile);
        }, [display, isMobile]);

        const setMapRefs = useCallback(
            (mapRefs_: MapRefs) => {
                if (mapRefs_) {
                    const mapNode = !!display.mapNode;

                    display.startup(mapRefs_);
                    if (mapNode) {
                        if (display.mapToolbar) {
                            display.mapStates.destroy();
                            display.map?.olMap
                                .getControls()
                                .forEach((control) => {
                                    control.dispose();
                                });
                            display.mapToolbar.dispose();
                            display._mapSetup();
                        }
                    }
                    if (setMapRefsProp) {
                        setMapRefsProp(mapRefs_);
                    }
                }
            },
            [display, setMapRefsProp]
        );

        const { activePanel } = display.panelManager;

        const [panelSize, setPanelsSize] = useState<string | number>(
            getDefultPanelSize(orientation)
        );

        useEffect(() => {
            setPanelsSize(() => {
                return getDefultPanelSize(orientation);
            });
        }, [orientation]);

        const onResize = useCallback(
            (sizes: number[]) => {
                const newPanelSize = sizes[1];
                if (activePanel) {
                    setPanelsSize(newPanelSize);
                }
            },
            [activePanel]
        );
        const onResizeEnd = useCallback(
            (sizes: number[]) => {
                const newPanelSize = sizes[1];
                if (activePanel) {
                    if (newPanelSize < PANEL_MIN_HEIGHT) {
                        display.panelManager.closePanel();
                        setPanelsSize(getDefultPanelSize(orientation));
                    }
                }
            },
            [activePanel, display.panelManager, orientation]
        );

        const panels = [];

        if (display.panelManager.panels.size > 0) {
            panels.push(
                <Panel
                    key="menu"
                    size={isPortrait ? "40px" : "50px"}
                    resizable={false}
                    style={{ flexGrow: 0, flexShrink: 0 }}
                >
                    <NavigationMenu
                        layout={isPortrait ? "horizontal" : "vertical"}
                        store={display.panelManager}
                    />
                </Panel>,
                <Panel
                    key="panels"
                    size={activePanel ? panelSize : 0}
                    resizable={!!activePanel}
                >
                    <PanelSwitcher display={display} />
                </Panel>
            );
        }

        panels.push(
            <Panel
                key="main"
                min={isPortrait ? 200 : 400}
                resizable={!!activePanel}
            >
                <Splitter layout="vertical">
                    <Panel key="map" min={isPortrait ? 200 : 400}>
                        <MapPane setMapRefs={setMapRefs} />
                    </Panel>
                    {display.tabsManager.tabs.length && (
                        <Panel key="tabs">
                            <WebMapTabs store={display.tabsManager} />
                        </Panel>
                    )}
                </Splitter>
            </Panel>
        );

        if (isPortrait) panels.reverse();

        return (
            <div className={classNames("ngw-webmap-display", className)}>
                <Splitter
                    layout={isPortrait ? "vertical" : "horizontal"}
                    onResize={onResize}
                    onResizeEnd={onResizeEnd}
                >
                    {panels}
                </Splitter>
            </div>
        );
    }
);
DisplayWidget.displayName = "Display";
