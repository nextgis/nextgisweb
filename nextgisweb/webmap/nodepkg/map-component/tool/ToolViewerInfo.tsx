import MapViewerInfoComp from "@nextgisweb/webmap/map-viewer-info";

import { useMapContext } from "../context/useMapContext";
import { MapControl } from "../control";
import type { MapControlProps } from "../control";
import { useToggleControl } from "../control/hook/useToggleControl";
import type { UseToggleControlOptions } from "../control/hook/useToggleControl";

import Icon from "@nextgisweb/icon/material/location_searching";

type ToolZoomProps = MapControlProps &
    UseToggleControlOptions & { label?: string };

export default function ToolViewerInfo({
    initialValue: defaultValue = false,
    groupId,
    value: controlledValue,
    label,
    onChange,
    canToggle,
    ...rest
}: ToolZoomProps) {
    const { mapStore } = useMapContext();
    const { toggle, value } = useToggleControl({
        initialValue: defaultValue,
        groupId,
        value: controlledValue,
        onChange,
        canToggle,
    });

    return (
        <MapControl
            margin
            bar
            {...rest}
            style={{ display: "flex", alignItems: "center" }}
        >
            <button
                type="button"
                title={label}
                aria-pressed={value}
                onClick={toggle}
            >
                <Icon />
            </button>

            {value && <MapViewerInfoComp map={mapStore.olMap} />}
        </MapControl>
    );
}
