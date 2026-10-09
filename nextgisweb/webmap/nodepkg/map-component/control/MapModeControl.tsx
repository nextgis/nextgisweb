import { observer } from "mobx-react-lite";

import { gettext } from "@nextgisweb/pyramid/i18n";

import { useMapContext } from "../context/useMapContext";

import { ToggleControl } from "./ToggleControl";
import type { ToggleControlProps } from "./ToggleControl";

const MapModeControl = observer((props: ToggleControlProps) => {
  const { mapStore } = useMapContext();
  const { started, mapMode, setMapMode, canChangeMapMode } = mapStore;

  return (
    <ToggleControl
      {...props}
      title={(active) =>
        !canChangeMapMode
          ? gettext("Map mode switching is unavailable")
          : active
            ? gettext("Switch to 3D")
            : gettext("Switch to 2D")
      }
      disabled={!started || !canChangeMapMode}
      onChange={(active) => {
        setMapMode(active ? "3d" : "2d");
      }}
      value={mapMode === "3d"}
      margin
    >
      3D
    </ToggleControl>
  );
});

MapModeControl.displayName = "MapModeControl";

export default MapModeControl;
