import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
} from "react";
import type React from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { updateControlAppearance } from "@nextgisweb/webmap/ol/control/updateControlAppearance";

import type {
    CreateControlOptions,
    TargetPosition,
} from "../../control-container/ControlContainer";
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

export function MapControl({ children, ...props }: MapControlProps) {
    const { margin, bar, style, className, setInstance, context, instance } =
        useMapControl({
            ...props,
        });

    const createControl = useCallback(() => {
        return context.mapStore.createControl(
            {
                id: props.id,
                onAdd() {
                    return undefined;
                },
                onRemove() {
                    // ignore
                },
            },
            {}
        );
    }, [props.id, context.mapStore]);

    useEffect(() => {
        setInstance(createControl());
    }, [createControl, setInstance]);

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
