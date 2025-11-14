import { observer } from "mobx-react-lite";

import { useMapContext } from "../context/useMapContext";

import { MapControl } from "./MapControl";
import type { MapControlProps } from "./MapControl";

import { LoadingOutlined } from "@ant-design/icons";

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
                    <LoadingOutlined spin />
                </div>
            </MapControl>
        )
    );
});

MapLoadingIndicatorControl.displayName = "MapLoadingIndicatorControl";

export default MapLoadingIndicatorControl;
