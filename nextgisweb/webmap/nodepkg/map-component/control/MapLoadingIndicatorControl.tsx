import { observer } from "mobx-react-lite";

import { Spin } from "@nextgisweb/gui/antd";

import { useMapContext } from "../context/useMapContext";

import { MapControl } from "./MapControl";
import type { MapControlProps } from "./MapControl";

const MapLoadingIndicatorControl = observer((props: MapControlProps) => {
    const { mapStore } = useMapContext();

    return (
        mapStore.isLoading && (
            <MapControl {...props}>
                <div
                    className="ol-unselectable"
                    style={{
                        paddingLeft: "5px",
                        paddingRight: "5px",
                    }}
                >
                    <Spin />
                </div>
            </MapControl>
        )
    );
});

MapLoadingIndicatorControl.displayName = "MapLoadingIndicatorControl";

export default MapLoadingIndicatorControl;
