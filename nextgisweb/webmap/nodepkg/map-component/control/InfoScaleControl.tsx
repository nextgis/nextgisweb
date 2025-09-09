import { observer } from "mobx-react-lite";
import type React from "react";

import { useMemoDebounce } from "@nextgisweb/pyramid/hook/useMemoDebounce";
import { formatScaleNumber } from "@nextgisweb/webmap/panel/print/util";

import { useMapContext } from "../context/useMapContext";

import { MapControl } from "./MapControl";
import type { MapControlProps } from "./MapControl";

export interface InfoScaleControlProps extends MapControlProps {
    renderNumber?: (val: number) => React.ReactNode;
}

const InfoScaleControl = observer(
    ({ renderNumber, ...props }: InfoScaleControlProps) => {
        const { mapStore } = useMapContext();
        const { scale } = mapStore;

        const debouncedScale = useMemoDebounce(scale, 100);

        return (
            <MapControl {...props}>
                <span
                    className="ol-control ol-scaleInfo ol-unselectable"
                    style={{ whiteSpace: "nowrap" }}
                >
                    {debouncedScale
                        ? `1 : ${renderNumber ? renderNumber(debouncedScale) : formatScaleNumber(debouncedScale)}`
                        : ""}
                </span>
            </MapControl>
        );
    }
);

InfoScaleControl.displayName = "InfoScaleControl";

export default InfoScaleControl;
