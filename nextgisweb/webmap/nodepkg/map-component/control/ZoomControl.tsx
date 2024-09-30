import type Control from "ol/control/Control";
import type { Options } from "ol/control/Zoom";
import { useEffect, useState } from "react";

import { useObjectState } from "@nextgisweb/gui/hook";
import { ZoomControl as OlZoomControl } from "@nextgisweb/webmap/ol/control/ZoomControl";

import { useMapContext } from "../context/useMapContext";
import { useMapControl } from "../hook/useMapControl";

import type { ControlProps } from "./MapControl";

export function ZoomControl({ position, ...props }: ControlProps<Options>) {
    const context = useMapContext();
    const [contpolProps] = useObjectState(props);

    const [instance, setInstance] = useState<Control>();
    useMapControl({ context, instance, position });

    useEffect(() => {
        setInstance(new OlZoomControl(contpolProps));
    }, [contpolProps]);

    return null;
}
