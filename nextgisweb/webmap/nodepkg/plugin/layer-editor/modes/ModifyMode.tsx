import type { Feature as OlFeature } from "ol";
import { shiftKeyOnly, singleClick } from "ol/events/condition";
import type { Geometry } from "ol/geom";
import type { Type as OlGeometryType } from "ol/geom/Geometry";
import { Modify } from "ol/interaction";
import type { ModifyEvent } from "ol/interaction/Modify";
import { useCallback, useState } from "react";

import { EditIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ToggleControl } from "@nextgisweb/webmap/map-component";

import { useEditorContext } from "../context/useEditorContext";
import { useInteraction } from "../hook/useInteraction";
import type { LayerEditorMode } from "../type";

export interface LayerEditorModeProps {
  geomType: OlGeometryType;
}

export const ModifyMode: LayerEditorMode<LayerEditorModeProps> = ({
  order,
  geomType,
}) => {
  const { features, addUndo, selectStyle } = useEditorContext();

  const [active, setActive] = useState(false);

  const createInteraction = useCallback(() => {
    const pre = new WeakMap<OlFeature<Geometry>, Geometry>();

    const modify = new Modify({
      features,
      style: selectStyle,
      deleteCondition: (evt) => shiftKeyOnly(evt) && singleClick(evt),
    });
    modify.on("modifystart", (e: ModifyEvent) => {
      e.features.forEach((f) => {
        const g = f.getGeometry();
        if (g) pre.set(f, g.clone());
      });
    });

    modify.on("modifyend", (e: ModifyEvent) => {
      e.features.forEach((f) => {
        const before = pre.get(f);
        if (before) {
          addUndo(() => f.setGeometry(before.clone()));
          pre.delete(f);
        }
      });
    });
    return modify;
  }, [addUndo, features, selectStyle]);

  useInteraction(ModifyMode.displayName, active, createInteraction);

  return (
    <ToggleControl
      groupId={ModifyMode.displayName}
      title={
        geomType.includes("LineString") || geomType.includes("Polygon") // MultiPoint is not suported in this way
          ? [
              gettext("Modify"),
              gettext("Add: click an edge and drag"),
              gettext("Delete: Shift + click a vertex"),
            ].join("\n")
          : gettext("Modify")
      }
      order={order}
      onChange={setActive}
    >
      <EditIcon />
    </ToggleControl>
  );
};

ModifyMode.displayName = "ModifyMode";
