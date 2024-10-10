import { useEffect, useState } from "react";

import { useObjectState } from "@nextgisweb/gui/hook";
import { ZoomControl as OlZoomControl } from "@nextgisweb/webmap/ol/control/ZoomControl";
import type { ZoomControlOptions } from "@nextgisweb/webmap/ol/control/ZoomControl";

import { useMapContext } from "../context/useMapContext";
import { useMapControl } from "../hook/useMapControl";

import type { ControlProps } from "./MapControl";

export function ZoomControl({
    position,
    fitOptions: fitOptionsProps,
    extent: extentProps,
    ...props
}: ControlProps<ZoomControlOptions>) {
    const context = useMapContext();
    const [controlProps] = useObjectState(props);
    const [fitOptions] = useObjectState(fitOptionsProps);
    const [extent] = useObjectState(extentProps);

    const [instance, setInstance] = useState<OlZoomControl>();

    useMapControl({ context, instance, position });

    useEffect(() => {
        const zoomControl = new OlZoomControl({
            ...controlProps,
        });
        setInstance(zoomControl);
    }, [controlProps, fitOptions]);

    useEffect(() => {
        if (!instance) return;

        instance.setFitOptions(fitOptions || {});
    }, [instance, fitOptions]);

    useEffect(() => {
        if (!instance) return;

        instance.setExtent(extent);
    }, [instance, extent]);

    return null;
}
