import {
    Control as OLControl
} from "ol/control.js";
import type React from "react";
import { useContext, useEffect, useRef } from "react";

import type { ButtonProps } from "@nextgisweb/gui/antd";
import { Button } from "@nextgisweb/gui/antd";

import { MapContext } from "./MapComponent";

interface ControlProps {
    control?: OLControl;
    options?: any;
    icon?: React.ReactNode;
    label?: string;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    onClick: () => void;
    buttonProps?: ButtonProps;
}

export function Control({
    control,
    icon,
    label,
    position,
    onClick,
    ...buttonProps
}: ControlProps) {
    const { adapter } = useContext(MapContext);
    const controlRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (adapter?.map && controlRef.current) {
            if (!control) {
                control = new OLControl({ element: controlRef.current });
            } else {
                control.setTarget(controlRef.current);
            }
            adapter.map.addControl(control);
        }

        return () => {
            if (control) adapter?.map.removeControl(control);
        };
    });

    return (
        <div
            ref={controlRef}
            className={`ol-unselectable ol-control ol-control-${position}`}
        >
            <Button icon={icon} size="small" onClick={onClick} {...buttonProps}>
                {label}
            </Button>
        </div>
    );
}
