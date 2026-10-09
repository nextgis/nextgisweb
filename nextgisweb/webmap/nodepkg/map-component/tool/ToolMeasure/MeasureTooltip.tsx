import classNames from "classnames";
import type OlMap from "ol/Map";
import Overlay from "ol/Overlay";
import type { Options as OverlayOptions } from "ol/Overlay";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { useThemeVariables } from "@nextgisweb/gui/hook";
import { CloseIcon } from "@nextgisweb/gui/icon";

import "./MeasureTooltip.less";

export interface MeasureTooltipProps extends Pick<
  OverlayOptions,
  "position" | "offset"
> {
  olMap: OlMap;
  children?: ReactNode;
  isEditing?: boolean;
  isCurrent?: boolean;
  onClose: () => void;
}

export function MeasureTooltip({
  olMap,
  offset = [0, -12],
  children,
  position,
  isEditing = false,
  isCurrent = false,
  onClose,
}: MeasureTooltipProps) {
  const [overlay, setOverlay] = useState<Overlay | null>(null);

  const positionRef = useRef(position);
  const offsetRef = useRef(offset);

  const calcOffset = useMemo(() => {
    return !isCurrent ? [0, -8] : offset;
  }, [isCurrent, offset]);

  useEffect(() => {
    const el = document.createElement("div");
    el.style.direction = getComputedStyle(document.body).direction;
    const overlay = new Overlay({
      offset: offsetRef.current,
      element: el,
      position: positionRef.current,
      stopEvent: false,
      positioning: "bottom-center",
      insertFirst: false,
    });
    setOverlay(overlay);
    olMap.addOverlay(overlay);

    return () => {
      olMap.removeOverlay(overlay);
    };
  }, [olMap]);

  const element = useMemo(() => overlay?.getElement(), [overlay]);

  useEffect(() => {
    if (overlay) {
      overlay.setPosition(position);
    }
    positionRef.current = position;
  }, [overlay, position]);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset, overlay]);

  useEffect(() => {
    if (overlay) {
      overlay.setOffset(calcOffset);
    }
  }, [calcOffset, overlay]);

  const themeVariables = useThemeVariables({
    "theme-color-primary": "colorPrimary",
    "theme-padding-xxs": "paddingXXS",
  });

  if (!element) {
    return null;
  }

  return createPortal(
    <div
      className={classNames("ngw-webmap-measure-tooltip", {
        "editing": isEditing,
        "current": isCurrent,
      })}
      style={themeVariables}
    >
      {children}
      {!isCurrent && (
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(evt) => evt.stopPropagation()}
        >
          <CloseIcon />
        </button>
      )}
    </div>,
    element
  );
}
