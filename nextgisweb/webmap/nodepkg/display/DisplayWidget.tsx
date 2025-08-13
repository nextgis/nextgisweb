import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Splitter } from "@nextgisweb/gui/antd";
import { useLayout } from "@nextgisweb/pyramid/layout/useLayout";
import type { Orientation } from "@nextgisweb/pyramid/layout/useLayout";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";
import { WebMapTabs } from "@nextgisweb/webmap/webmap-tabs";

import type { MapRefs, TinyConfig } from "../type";

import { Display } from "./Display";
import { NavigationMenu } from "./component/NavigationMenu";
import { PanelSwitcher } from "./component/PanelSwitcher";
import { MapPane } from "./component/map-panel";

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
    ({ config, className, display: displayProp }: DisplayComponentProps) => {
        const [display] = useState<Display>(
            () =>
                displayProp ||
                new Display({
                    config,
                })
        );

        const { orientation, isPortrait, screenReady, isMobile } = useLayout();

        useEffect(() => {
            display.startup();
        }, [display]);

        useEffect(() => {
            display.setIsMobile(isMobile);
        }, [display, isMobile]);

        const { activePanel } = display.panelManager;

        const [panelSize, setPanelsSize] = useState<string | number>(
            getDefultPanelSize(orientation)
        );

        useEffect(() => {
            setPanelsSize(() => {
                return getDefultPanelSize(orientation);
            });
        }, [orientation, screenReady]);

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

        const panelsToShow = useMemo(() => {
            if (!screenReady) {
                return [];
            }
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
                            <MapPane display={display} />
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
            return panels;
        }, [activePanel, display, isPortrait, panelSize, screenReady]);

        if (!screenReady) {
            return <></>;
        }

        return (
            <div className={classNames("ngw-webmap-display", className)}>
                <Splitter
                    layout={isPortrait ? "vertical" : "horizontal"}
                    onResize={onResize}
                    onResizeEnd={onResizeEnd}
                >
                    {panelsToShow}
                </Splitter>
            </div>
        );
    }
);
DisplayWidget.displayName = "DisplayWidget";
