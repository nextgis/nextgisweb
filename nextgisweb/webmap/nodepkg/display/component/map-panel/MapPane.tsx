import { reaction } from "mobx";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";
import { MapContainer } from "@nextgisweb/webmap/map-component/MapContainer";
import { setURLParam } from "@nextgisweb/webmap/utils/URL";

import type { Display } from "../../Display";

import { MapControls } from "./MapControls";
import { MapHighlight } from "./MapHighlight";
import { PanelMapComponents } from "./PanelMapComponents";
import { PluginMapComponents } from "./PluginMapComponents";
import { WebmapLayers } from "./WebmapLayers";

import "./MapPane.less";

export const MapPane = observer(
  ({ display, children }: { display: Display; children?: ReactNode }) => {
    const themeVariables = useThemeVariables({
      "theme-color-primary": "colorPrimary",
    });
    useEffect(() => {
      const dispose = reaction(
        () => display.map.mapMode,
        (mode) => {
          setURLParam("mode", mode === "2d" ? "" : mode);
        }
      );
      return dispose;
    }, [display]);

    return (
      <MapContainer
        className="ngw-webmap-display-map-pane"
        mapStore={display.map}
        style={themeVariables}
      >
        <MapControls
          display={display}
          mapStore={display.map}
          isTinyMode={display.isTinyMode}
        />
        <MapHighlight
          mapStore={display.map}
          highlightStore={display.highlighter}
        />
        <WebmapLayers treeStore={display.treeStore} />
        <PanelMapComponents display={display} />
        <PluginMapComponents display={display} />

        {children}
      </MapContainer>
    );
  }
);

MapPane.displayName = "MapPane";
