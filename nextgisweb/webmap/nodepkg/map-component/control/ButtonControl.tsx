import type Control from "ol/control/Control";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { useObjectState } from "@nextgisweb/gui/hook";
import type { ButtonControlOptions } from "@nextgisweb/webmap/ol/control/createButtonControl";

import { useMapContext } from "../context/useMapContext";
import { useMapControl } from "../hook/useMapControl";

import type { ControlProps } from "./MapControl";

type ButtonControlComponentOptions = ControlProps<
    Omit<ButtonControlOptions, "html">
>;

interface MapControlProps extends ButtonControlComponentOptions {
    children?: ReactNode;
}

export function ButtonControl({ children, ...props }: MapControlProps) {
    const [propState] = useObjectState(props);
    const context = useMapContext();

    const portal = useRef(document.createElement("div"));

    const createControl = useCallback(() => {
        return context.mapAdapter?.createButtonControl({
            html: portal.current,
            ...propState,
        });
    }, [context.mapAdapter, propState]);

    const [instance, setInstance] = useState<Control | undefined>();

    useMapControl({ context, instance, position: propState.position });

    useEffect(() => {
        setInstance(createControl());
    }, [createControl]);

    return createPortal(children === 0 ? "0" : children, portal.current);
}
