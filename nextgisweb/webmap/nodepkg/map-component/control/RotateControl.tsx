import { observer } from "mobx-react-lite";
import type { Options as OlRotateOptions } from "ol/control/Rotate";
import { useCallback, useMemo } from "react";
import type { CSSProperties } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { DEFAULT_VIEW_ANIMATION_DURATION } from "@nextgisweb/webmap/map-adapter/constant";

import { useMapContext } from "../context/useMapContext";

import { ButtonControl } from "./ButtonControl";
import type { ControlProps } from "./MapControl";

import NorthIcon from "@nextgisweb/icon/material/arrow_upward";

import "./RotateControl.less";

interface RotateControlOptions extends Pick<
  OlRotateOptions,
  "tipLabel" | "duration" | "autoHide"
> {
  style?: CSSProperties;
  className?: string;
}

export type RotateControlProps = ControlProps<RotateControlOptions>;

const RotateControl = observer(
  ({
    order,
    style,
    position,
    tipLabel = gettext("Reset rotation"),
    duration = DEFAULT_VIEW_ANIMATION_DURATION,
    autoHide = true,
    className,
  }: RotateControlProps) => {
    const { mapStore } = useMapContext();
    const { rotation } = mapStore;

    const hidden = useMemo(
      () => autoHide && rotation === 0,
      [autoHide, rotation]
    );

    const onReset = useCallback(() => {
      mapStore.setRotation(0, duration);
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
        style={style}
        className={className}
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
