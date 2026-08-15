import { Snap } from "ol/interaction";
import { useCallback } from "react";

import { Checkbox, Popover } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ToggleControl } from "@nextgisweb/webmap/map-component";

import { useEditorContext } from "./context/useEditorContext";
import { useInteraction } from "./hook/useInteraction";
import type { SnapSettings } from "./type";

import CenterFocusWeakIcon from "@nextgisweb/icon/material/center_focus_weak/outline";

const msgSnapModes = gettext("Snapping");
const msgSnapToVertices = gettext("To vertices");
const msgSnapToEdges = gettext("To edges");
const msgSnapToIntersections = gettext("To intersections");

export function SnapToggle({
  order,
  value,
  onChange,
}: {
  order: number;
  value: SnapSettings;
  onChange: (val: SnapSettings) => void;
}) {
  const { source } = useEditorContext();

  const { vertex, edge, intersection } = value;

  const active = vertex || edge || intersection;

  const createSnap = useCallback(
    () => new Snap({ source, vertex, edge, intersection }),
    [source, vertex, edge, intersection]
  );

  useInteraction(
    `${SnapToggle.displayName}-${[vertex, edge, intersection].join(",")}`,
    active,
    createSnap
  );

  const setMode = useCallback(
    (mode: keyof SnapSettings, checked: boolean) => {
      onChange({ ...value, [mode]: checked });
    },
    [value, onChange]
  );

  return (
    <ToggleControl order={order} title={msgSnapModes} value={active}>
      <Popover
        trigger="click"
        placement="bottomLeft"
        content={
          <div
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={edge}
              onChange={(e) => setMode("edge", e.target.checked)}
            >
              {msgSnapToEdges}
            </Checkbox>
            <Checkbox
              checked={vertex}
              onChange={(e) => setMode("vertex", e.target.checked)}
            >
              {msgSnapToVertices}
            </Checkbox>
            <Checkbox
              checked={intersection}
              onChange={(e) => setMode("intersection", e.target.checked)}
            >
              {msgSnapToIntersections}
            </Checkbox>
          </div>
        }
      >
        <span>
          <CenterFocusWeakIcon />
        </span>
      </Popover>
    </ToggleControl>
  );
}

SnapToggle.displayName = "SnapToggle";
