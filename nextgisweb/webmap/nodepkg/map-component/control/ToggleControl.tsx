import isEqual from "lodash/isEqual";
import { useCallback, useEffect, useRef, useState } from "react";

import { useObjectState } from "@nextgisweb/gui/hook";
import { createToggleControl } from "@nextgisweb/webmap/ol/control/createToggleControl";
import type {
    ToggleControl as IToggleControl,
    ToggleControlOptions,
} from "@nextgisweb/webmap/ol/control/createToggleControl";

import { useMapContext } from "../context/useMapContext";
import { useMapControl } from "../hook/useMapControl";

import type { ControlProps } from "./MapControl";

export type ToggleControlProps = ControlProps<ToggleControlOptions>;

export function ToggleControl({
    position,
    ...toggleOptions
}: ToggleControlProps) {
    const [options] = useObjectState(toggleOptions);
    const context = useMapContext();
    const [instance, setInstance] = useState<IToggleControl>();
    const prevOptionsRef = useRef<ToggleControlOptions>();

    useMapControl({ context, instance, position });

    const createControl = useCallback(() => {
        return createToggleControl(options);
    }, [options]);

    useEffect(() => {
        const control = createControl();
        setInstance(control);

        return () => {
            control.setMap(null);
        };
    }, [createControl]);

    useEffect(() => {
        if (!instance || !options) return;

        if (!isEqual(options, prevOptionsRef.current)) {
            instance.changeStatus(options.status);
            prevOptionsRef.current = options;
        }
    }, [instance, options]);

    return null;
}
