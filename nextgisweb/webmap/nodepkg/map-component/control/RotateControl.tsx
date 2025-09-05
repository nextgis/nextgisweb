import { observer } from "mobx-react-lite";
import type { Options as OlRotateOptions } from "ol/control/Rotate";
import { easeOut } from "ol/easing";
import { useCallback, useMemo } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";

import { useMapContext } from "../context/useMapContext";

import { ButtonControl } from "./ButtonControl";
import type { ControlProps } from "./MapControl";

import NorthIcon from "@nextgisweb/icon/material/arrow_upward";

import "./RotateControl.less";

type RotateControlOptions = Pick<
    OlRotateOptions,
    "tipLabel" | "duration" | "autoHide"
>;

export type RotateControlProps = ControlProps<RotateControlOptions>;

const RotateControl = observer(
    ({
        order,
        position,
        tipLabel = gettext("Reset rotation"),
        duration = 250,
        autoHide = true,
    }: RotateControlProps) => {
        const { mapStore } = useMapContext();
        const { rotation } = mapStore;

        const hidden = useMemo(
            () => autoHide && rotation === 0,
            [autoHide, rotation]
        );

        const onReset = useCallback(() => {
            const map = mapStore.olMap;
            const view = map.getView();
            if (!view) {
                // the map does not have a view, so we can't act
                // upon it
                return;
            }
            const rotation = view.getRotation();

            if (rotation !== undefined) {
                if (duration > 0 && rotation % (2 * Math.PI) !== 0) {
                    view.animate({
                        rotation: 0,
                        duration,
                        easing: easeOut,
                    });
                } else {
                    view.setRotation(0);
                }
            }
        }, [mapStore, duration]);

        if (hidden) {
            return null;
        }

        return (
            <ButtonControl
                onClick={onReset}
                position={position}
                order={order}
                title={tipLabel}
            >
                <span
                    className="ol-compass"
                    style={{ transform: `rotate(${rotation}rad)` }}
                >
                    <NorthIcon />
                </span>
            </ButtonControl>
        );
    }
);

RotateControl.displayName = "RotateControl";

export default RotateControl;
