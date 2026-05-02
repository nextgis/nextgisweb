import Overlay from "ol/Overlay";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { MapStore } from "../../ol/MapStore";

import type {
  AnnotationChangeCallback,
  AnnotationFeature,
} from "./AnnotationFeature";
import { AnnotationPopupContent } from "./AnnotationPopupContent";
import { getPopupCoordinates } from "./util/getPopupCoordinates";
import "./AnnotationsPopup.less";

export interface AnnotationPopupOverlay extends Overlay {
  annFeature: AnnotationFeature;
}

interface AnnotationsPopupProps {
  annFeature: AnnotationFeature;
  editable?: boolean;
  map: MapStore;
  onChange?: AnnotationChangeCallback;
}

function getClassName(annFeature: AnnotationFeature): string {
  const classNames = ["ol-popup", "annotation"];
  const accessType = annFeature.getAccessType();

  if (accessType) {
    classNames.push(accessType);
  }

  return classNames.join(" ");
}

export function AnnotationsPopup({
  annFeature,
  editable = false,
  map,
  onChange,
}: AnnotationsPopupProps) {
  const positionRef = useRef(getPopupCoordinates(annFeature));
  const [overlay, setOverlay] = useState<AnnotationPopupOverlay | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.className = getClassName(annFeature);
    el.style.display = "block";
    el.title = annFeature.getAccessTypeTitle() ?? "";
    const overlay = new Overlay({
      autoPan: false,
      insertFirst: false,
      element: el,
      stopEvent: true,
      positioning: "bottom-center",
      position: positionRef.current,
    }) as AnnotationPopupOverlay;

    overlay.annFeature = annFeature;
    setOverlay(overlay);
    map.olMap.addOverlay(overlay);

    return () => {
      map.olMap.removeOverlay(overlay);
    };
  }, [annFeature, map.olMap]);

  const element = useMemo(() => {
    return overlay?.getElement();
  }, [overlay]);
  const position = getPopupCoordinates(annFeature);

  const descriptionHtml = annFeature.getDescriptionAsHtml();

  useEffect(() => {
    if (overlay) {
      overlay.setPosition(position);
    }
    positionRef.current = position;
  }, [overlay, position]);

  if (!element) {
    return null;
  }

  return createPortal(
    <>
      <a
        className="ol-popup-closer"
        href="#"
        onClick={(event) => event.preventDefault()}
      />
      <div className="ol-popup-content">
        <AnnotationPopupContent
          descriptionHtml={descriptionHtml}
          editable={editable}
          onEdit={() => onChange?.(annFeature)}
        />
      </div>
    </>,
    element
  );
}
