import type OlMap from "ol/Map";
import { always } from "ol/events/condition";
import { DragZoom } from "ol/interaction";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";

import { ToggleControl } from "../control";
import type { ToggleControlProps } from "../control";

import ZoomInIcon from "@nextgisweb/icon/material/zoom_in";
import ZoomOutIcon from "@nextgisweb/icon/material/zoom_out";

type ToolZoomProps = { out?: boolean; olMap: OlMap } & ToggleControlProps;

function ToolZoom({ olMap, out = false, ...rest }: ToolZoomProps) {
  const interactionRef = useRef<DragZoom | null>(null);
  const activeRef = useRef(false);

  const title = useMemo(
    () => (out ? gettext("Zoom out") : gettext("Zoom in")),
    [out]
  );

  useEffect(() => {
    const dz = new DragZoom({ condition: always, out });
    dz.setActive(activeRef.current);
    olMap.addInteraction(dz);
    interactionRef.current = dz;

    return () => {
      try {
        dz.setActive(false);
        olMap.removeInteraction(dz);
      } finally {
        interactionRef.current = null;
        const el = olMap.getTargetElement();
        if (el) {
          el.style.cursor = "auto";
        }
      }
    };
  }, [olMap, out]);

  const setActive = useCallback(
    (active: boolean) => {
      activeRef.current = active;
      const dz = interactionRef.current;
      if (!dz) return;
      dz.setActive(active);
      const el = olMap.getTargetElement();
      if (el)
        el.style.cursor = active ? (out ? "zoom-out" : "zoom-in") : "auto";
    },
    [olMap, out]
  );

  return (
    <ToggleControl {...rest} title={title} onChange={setActive}>
      {out ? <ZoomOutIcon /> : <ZoomInIcon />}
    </ToggleControl>
  );
}

export default ToolZoom;
