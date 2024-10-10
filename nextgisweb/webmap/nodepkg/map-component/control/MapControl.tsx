import type Control from "ol/control/Control";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import type {
    ControlPosition,
    CreateControlOptions,
} from "../../control-container/ControlContainer";
import { useMapContext } from "../context/useMapContext";
import { useMapControl } from "../hook/useMapControl";

export type ControlProps<P> = P & {
    position?: ControlPosition;
};

export type ControlOptions = CreateControlOptions &
    ControlProps<{
        id?: string;

        style?: Partial<CSSStyleDeclaration>;

        className?: string;
        placeholder?: ReactNode;
    }>;

interface MapControlProps extends ControlOptions {
    children?: ReactNode;
}

export function MapControl(props: MapControlProps) {
    const { bar, margin, addClass, children, position } = props;
    const context = useMapContext();

    const portal = useRef(document.createElement("div"));

    const createControl = useCallback(() => {
        return context?.mapAdapter?.createControl(
            {
                onAdd() {
                    return portal.current;
                },

                onRemove() {
                    //
                },
            },
            { bar, margin, addClass }
        );
    }, [context?.mapAdapter, bar, margin, addClass]);

    const [instance, setInstance] = useState<Control>();

    useMapControl({ context, instance, position });

    useEffect(() => {
        setInstance(createControl());
    }, [createControl]);

    return createPortal(children, portal.current);
}
