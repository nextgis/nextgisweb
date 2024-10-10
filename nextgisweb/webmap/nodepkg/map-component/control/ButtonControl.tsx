import type Control from "ol/control/Control";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { useObjectState } from "@nextgisweb/gui/hook";
import type { ButtonControlOptions } from "@nextgisweb/webmap/ol/control/createButtonControl";

import { useMapContext } from "../context/useMapContext";
import { useMapControl } from "../hook/useMapControl";

import type { ControlProps } from "./MapControl";

interface MapControlProps extends ControlProps<ButtonControlOptions> {
    children?: ReactNode;
}

export function ButtonControl<P extends MapControlProps = MapControlProps>(
    props: P
) {
    const [propState] = useObjectState(props);
    const context = useMapContext();

    const createControl = useCallback(() => {
        return context.mapAdapter?.createButtonControl(propState);
    }, [context.mapAdapter, propState]);

    const [instance, setInstance] = useState<Control>();

    useMapControl({ context, instance, position: propState.position });

    useEffect(() => {
        setInstance(createControl());
    }, [createControl, propState.position]);

    return null;
}
