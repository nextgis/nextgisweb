import classNames from "classnames";
import { Control } from "ol/control";
import type { Layer } from "ol/layer";
import type RenderEvent from "ol/render/Event";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { gettext } from "@nextgisweb/pyramid/i18n";

import { useMapContext } from "../../context/useMapContext";

import { postcompose, precompose } from "./swipeControlUtils";

import Icon from "@nextgisweb/icon/material/sync";
import "./SwipeControl.less";

export type Orientation = "vertical" | "horizontal";

export interface SwipeControlProps {
    className?: string;

    layers?: Layer[];
    position?: number;
    orientation?: Orientation;
    onRotateRequest?: () => void;
}

export default function SwipeControl({
    className = "ol-swipe",
    layers = [],
    position: positionProp = 0.5,
    orientation: orientationProp = "vertical",
    onRotateRequest,
}: SwipeControlProps) {
    const { mapStore } = useMapContext();
    const { olMap, targetElement } = mapStore;

    const [position, setPosition] = useState(positionProp);
    const [orientation, setOrientation] =
        useState<Orientation>(orientationProp);
    const [isReversed, setIsReversed] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const [element, setElement] = useState<HTMLDivElement | null>(null);

    const controlRef = useRef<Control | null>(null);
    const precomposeRef = useRef<(e: RenderEvent) => void>(null);

    useEffect(() => {
        const el = document.createElement("div");
        setElement(el);

        el.className = classNames(className, "ol-unselectable ol-control");

        const control = new Control({ element: el });
        controlRef.current = control;
        olMap.addControl(control);

        return () => {
            olMap.removeControl(control);
            controlRef.current = null;
            setElement(null);
        };
    }, [className, olMap]);

    useEffect(() => {
        const updateControlStyle = () => {
            if (!element) return;

            if (orientation === "vertical") {
                element.style.left = `${position * 100}%`;
                element.style.top = "";
            } else {
                element.style.top = `${position * 100}%`;
                element.style.left = "";
            }

            element.classList.remove("vertical", "horizontal", "reversed");
            element.classList.add(orientation);
            if (isReversed) {
                element.classList.add("reversed");
            }
        };
        updateControlStyle();
        olMap.render();
    }, [position, orientation, isReversed, olMap, element]);

    useEffect(() => {
        precomposeRef.current = (e: RenderEvent) => {
            precompose(e, { orientation, isReversed, position });
        };
        olMap.render();
    }, [orientation, isReversed, position, olMap]);

    useEffect(() => {
        const pre = (e: RenderEvent) => precomposeRef.current?.(e);

        layers.forEach((layer) => {
            layer.on("prerender", pre);
            layer.on("postrender", postcompose);
        });
        olMap.render();

        return () => {
            layers.forEach((layer) => {
                layer.un("prerender", pre);
                layer.un("postrender", postcompose);
            });
            olMap.render();
        };
    }, [layers, olMap]);

    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (!element) return;
            if (!element.contains(e.target as Node)) return;
            setIsDragging(true);
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            if (!targetElement) return;

            const rect = targetElement.getBoundingClientRect();
            let next: number;
            if (orientation === "vertical") {
                const pageX = e.clientX - rect.left;
                next = Math.min(Math.max(0, pageX / rect.width), 1);
            } else {
                const pageY = e.clientY - rect.top;
                next = Math.min(Math.max(0, pageY / rect.height), 1);
            }
            setPosition(next);
        };

        const onMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);

        return () => {
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [element, isDragging, targetElement, orientation]);

    const onToggleRotate = useCallback(() => {
        const states: Array<{ orientation: Orientation; isReversed: boolean }> =
            [
                { orientation: "vertical", isReversed: false },
                { orientation: "horizontal", isReversed: false },
                { orientation: "vertical", isReversed: true },
                { orientation: "horizontal", isReversed: true },
            ];
        const idx = states.findIndex(
            (s) => s.orientation === orientation && s.isReversed === isReversed
        );
        const next = states[(idx + 1) % states.length];
        setOrientation(next.orientation);
        setIsReversed(next.isReversed);
        onRotateRequest?.();
    }, [isReversed, onRotateRequest, orientation]);

    if (!element) {
        return null;
    }

    return createPortal(
        <>
            <button />
            <div
                className="ol-swipe-toggle"
                title={gettext("Rotate swipe")}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleRotate();
                }}
            >
                <Icon />
            </div>
        </>,
        element
    );
}
