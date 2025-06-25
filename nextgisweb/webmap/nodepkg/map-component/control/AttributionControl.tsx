import type { Options } from "ol/control/Attribution";
import type Control from "ol/control/Control";
import { useEffect, useState } from "react";

import { useObjectState } from "@nextgisweb/gui/hook";
import { Attribution } from "@nextgisweb/webmap/ol/control/Attribution";

import { useMapContext } from "../context/useMapContext";
import { useMapControl } from "../hook/useMapControl";

import type { ControlProps } from "./MapControl";

export function AttributionControl({
    position = "bottom-right",
    ...props
}: ControlProps<Options>) {
    const context = useMapContext();
    const [contpolProps] = useObjectState(props);

    const [instance, setInstance] = useState<Control>();
    useMapControl({ context, instance, position });

    useEffect(() => {
        setInstance(new Attribution(contpolProps));
    }, [contpolProps]);

    return null;
}
