import { observer } from "mobx-react-lite";

import { gettext } from "@nextgisweb/pyramid/i18n";
import type { MapAdapterPlugin } from "@nextgisweb/webmap/map-adapter/registry";

import { useMapContext } from "../context/useMapContext";

import { ToggleControl } from "./ToggleControl";
import type { ToggleControlProps } from "./ToggleControl";

export interface MapModeControlProps extends ToggleControlProps {
  adapterPlugin: MapAdapterPlugin;
}

const MapModeControl = observer((props: MapModeControlProps) => {
  const { adapterPlugin, ...controlProps } = props;
  const { mapStore } = useMapContext();
  const { started, mapMode, setMapMode, canChangeMapMode } = mapStore;

  return (
    <ToggleControl
      {...controlProps}
      title={(active) =>
        !canChangeMapMode
          ? gettext("Map mode switching is unavailable")
          : active
            ? gettext("Switch to 3D")
            : gettext("Switch to 2D")
      }
      disabled={!started || !canChangeMapMode}
      onChange={(active) => {
        setMapMode(active ? adapterPlugin.key : "2d");
      }}
      value={mapMode === adapterPlugin.key}
      margin
    >
      3D
    </ToggleControl>
  );
});

MapModeControl.displayName = "MapModeControl";

export default MapModeControl;
