import type Control from "ol/control/Control";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import type React from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { updateControlAppearance } from "@nextgisweb/webmap/ol/control/updateControlAppearance";

import type {
    CreateControlOptions,
    TargetPosition,
} from "../../control-container/ControlContainer";
import { useMapContext } from "../context/useMapContext";
import { useMapControl } from "../hook/useMapControl";

export type ControlProps<P = unknown> = P & {
    position?: TargetPosition;
    order?: number;
    id?: string;
};

export type ControlOptions = CreateControlOptions &
    ControlProps<{
        style?: React.CSSProperties;
        className?: string;
        targetStyle?: React.CSSProperties;
    }>;

export interface MapControlProps extends ControlOptions {
    children?: ReactNode;
}

export const MapControlContext = createContext<MapControlProps | null>(null);
export function useMapControlContext() {
    return useContext(MapControlContext);
}

export function MapControl(props: MapControlProps) {
    const { id, bar, order, style, children, className, targetStyle } = props;
    const context = useMapContext();
    const { mapStore } = useMapContext();

    const parent = useMapControlContext();
    const inside = parent && parent.id;

    const [position, margin] = useMemo<
        [TargetPosition | undefined, boolean | undefined]
    >(() => {
        if (inside) {
            return [{ inside }, false];
        }
        return [props.position, props.margin];
    }, [props, inside]);

    const createControl = useCallback(() => {
        return mapStore?.createControl(
            {
                id,
                onAdd() {
                    return undefined;
                },
                onRemove() {
                    // ignore
                },
            },
            {}
        );
    }, [id, mapStore]);

    const [instance, setInstance] = useState<Control>();
    useMapControl({ context, instance, position, order, targetStyle, id });

    useEffect(() => {
        setInstance(createControl());
    }, [createControl]);

    const element = useMemo<HTMLElement | null>(() => {
        // @ts-expect-error element is protected property
        return instance?.element ?? null;
    }, [instance]);

    useEffect(() => {
        if (element) {
            updateControlAppearance(element, { bar, margin, className, style });
        }
    }, [element, bar, className, margin, style]);

    if (!element || !children) return null;

    return createPortal(
        <MapControlContext value={props}>{children}</MapControlContext>,
        element
    );
}
