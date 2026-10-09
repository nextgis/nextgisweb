import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Splitter } from "@nextgisweb/gui/antd";
import { useLayout } from "@nextgisweb/pyramid/layout/useLayout";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";
import { WebMapTabs } from "@nextgisweb/webmap/webmap-tabs";

import { registry } from "../panel/registry";
import type { TinyConfig } from "../type";
import { setURLParam } from "../utils/URL";

import { Display } from "./Display";
import { NavigationMenu } from "./component/NavigationMenu";
import { PanelSwitcher } from "./component/PanelSwitcher";
import { MapPane } from "./component/map-panel";
import { DisplayContext } from "./context/useDisplayContext";

import "./DisplayWidget.less";

const { Panel } = Splitter;

export interface DisplayComponentProps {
  mapChildren?: ReactNode;
  tinyConfig?: TinyConfig;
  className?: string;
  display?: Display;
  config: DisplayConfig;
}

const PANEL_MIN_HEIGHT = 20;
const PANELS_DEF_LANDSCAPE_SIZE = 350;
const PANELS_DEF_PORTRAIT_SIZE = "50%";

const emptyModeURLValue = "none";

function getDefultPanelSize(isPortrait: boolean) {
  return isPortrait ? PANELS_DEF_PORTRAIT_SIZE : PANELS_DEF_LANDSCAPE_SIZE;
}

export const DisplayWidget = observer(
  ({
    config,
    display: displayProp,
    className,
    mapChildren,
  }: DisplayComponentProps) => {
    const [display] = useState<Display>(
      () =>
        displayProp ||
        new Display({
          config,
        })
    );
    const [mounted, setMounted] = useState(false);
    const { isMobile, screenReady, isPortrait } = useLayout();
    const {
      map,
      urlParams,
      isTinyMode,
      tabsManager,
      panelManager,
      setIsMobile,
    } = display;
    const { ready } = map;
    const { panel: requestedPanel, panels: allowedPanels } = urlParams;

    useEffect(() => {
      display.startup();
    }, [display]);

    useEffect(() => {
      setIsMobile(isMobile);
    }, [setIsMobile, isMobile]);

    const { activePanel, activePanelName, items } = panelManager;
    const { tabs } = tabsManager;

    useEffect(() => {
      if (mounted || !screenReady || !ready) return;

      let canceled = false;
      if (isTinyMode) {
        panelManager.setAllowPanels(allowedPanels || []);
      }

      async function buildPluginsAndActivate() {
        const plugins = registry.queryAll();

        plugins.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        for (const plugin of plugins) {
          await panelManager.registerPlugin(plugin);
        }
        if (canceled) return;

        const requestedItem = requestedPanel
          ? panelManager.getItem(requestedPanel)
          : undefined;
        const hasRequestedWidget = requestedItem?.type === "widget";
        const isEmptyMode = requestedPanel === emptyModeURLValue;

        if (hasRequestedWidget) {
          panelManager.setActive(requestedPanel, "init");
        } else if (!isEmptyMode) {
          const firstPanelKey = panelManager.panels.keys().next().value;
          if (firstPanelKey) {
            panelManager.setActive(firstPanelKey, "init");
          }
        }
        setMounted(true);
      }

      buildPluginsAndActivate();

      return () => {
        canceled = true;
      };
    }, [
      ready,
      mounted,
      isTinyMode,
      screenReady,
      panelManager,
      allowedPanels,
      requestedPanel,
    ]);

    useEffect(() => {
      if (!mounted) return;
      if (activePanelName) {
        setURLParam("panel", activePanelName);
      } else {
        setURLParam("panel", emptyModeURLValue);
      }
    }, [activePanelName, mounted]);

    const [panelSize, setPanelSize] = useState<string | number>(() =>
      getDefultPanelSize(isPortrait)
    );

    useEffect(() => {
      setPanelSize(() => {
        return getDefultPanelSize(isPortrait);
      });
    }, [isPortrait, screenReady]);

    const onResize = useCallback(
      (sizes: number[]) => {
        const newPanelSize = sizes[1];
        if (activePanel) {
          setPanelSize(newPanelSize);
        }
      },
      [activePanel]
    );
    const onResizeEnd = useCallback(
      (sizes: number[]) => {
        const newPanelSize = sizes[1];
        if (activePanel) {
          if (newPanelSize < PANEL_MIN_HEIGHT) {
            panelManager.closePanel();
            setPanelSize(getDefultPanelSize(isPortrait));
          }
        }
      },
      [activePanel, panelManager, isPortrait]
    );

    const panelsToShow = useMemo(() => {
      if (!screenReady) {
        return [];
      }
      const showPanels = [];

      if (items.length > 0) {
        showPanels.push(
          <Panel
            key="menu"
            size={isPortrait ? "40px" : "50px"}
            resizable={false}
            style={{ flexGrow: 0, flexShrink: 0 }}
          >
            <NavigationMenu
              orientation={isPortrait ? "horizontal" : "vertical"}
              store={panelManager}
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
      showPanels.push(
        <Panel key="main" min={200} resizable={!!activePanel}>
          <Splitter orientation="vertical">
            <Panel key="map">
              <MapPane display={display}>{mapChildren}</MapPane>
            </Panel>
            {tabs.length && (
              <Panel key="tabs">
                <WebMapTabs store={tabsManager} />
              </Panel>
            )}
          </Splitter>
        </Panel>
      );

      if (isPortrait) showPanels.reverse();
      return showPanels;
    }, [
      panelManager,
      tabsManager,
      mapChildren,
      screenReady,
      activePanel,
      isPortrait,
      panelSize,
      display,
      items,
      tabs,
    ]);

    const displayContextValue = useMemo(() => {
      return { display };
    }, [display]);

    if (!screenReady) {
      return <></>;
    }

    return (
      <DisplayContext value={displayContextValue}>
        <div className={classNames("ngw-webmap-display", className)}>
          <Splitter
            orientation={isPortrait ? "vertical" : "horizontal"}
            onResize={onResize}
            onResizeEnd={onResizeEnd}
          >
            {panelsToShow}
          </Splitter>
        </div>
      </DisplayContext>
    );
  }
);
DisplayWidget.displayName = "DisplayWidget";
