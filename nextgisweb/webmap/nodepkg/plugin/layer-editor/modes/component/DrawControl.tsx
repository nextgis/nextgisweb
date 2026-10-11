import { unByKey } from "ol/Observable";
import type { Type as OlGeometryType } from "ol/geom/Geometry";
import type { Draw } from "ol/interaction";
import { useCallback, useEffect, useState } from "react";

import { useKeydownListener } from "@nextgisweb/gui/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ButtonControl } from "@nextgisweb/webmap/map-component";

import { CoordInput } from "./CoordInput";

import FinishIcon from "@nextgisweb/icon/material/check";
import CancelIcon from "@nextgisweb/icon/material/close";
import UndoIcon from "@nextgisweb/icon/material/undo";

export function DrawControl({
  draw,
  geomType,
  enableCoordinateInput = false,
}: {
  draw: Draw;
  geomType?: OlGeometryType;
  enableCoordinateInput?: boolean;
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [coordOpen, setCoordOpen] = useState(false);
  const [coordFilled, setCoordFilled] = useState(false);

  useEffect(() => {
    const onStart = () => {
      setIsDrawing(true);
      setCanUndo(true);
    };
    const onAbort = () => {
      setIsDrawing(false);
      setCanUndo(false);
    };
    const onEnd = () => {
      onAbort();
      setCoordOpen(false);
    };

    const keyStart = draw.on("drawstart", onStart);
    const keyAbort = draw.on("drawabort", onAbort);
    const keyEnd = draw.on("drawend", onEnd);

    return () => {
      unByKey(keyStart);
      unByKey(keyAbort);
      unByKey(keyEnd);
    };
  }, [draw]);

  const onFinish = useCallback(() => {
    draw.finishDrawing();
  }, [draw]);

  const onUndo = useCallback(() => {
    if (canUndo) {
      draw.removeLastPoint();
    }
  }, [draw, canUndo]);

  const onCancel = useCallback(() => {
    draw.abortDrawing();
    setIsDrawing(false);
    setCanUndo(false);
  }, [draw]);

  useKeydownListener(
    "Enter",
    (e) => isDrawing && !coordFilled && (e.preventDefault(), onFinish())
  );
  useKeydownListener("Escape", (e) => {
    if (coordOpen) {
      e.preventDefault();
      setCoordOpen(false);
    } else if (isDrawing) {
      e.preventDefault();
      onCancel();
    }
  });
  useKeydownListener(
    "Backspace",
    (e) => isDrawing && !coordFilled && (e.preventDefault(), onUndo())
  );
  useKeydownListener("z", (e) => {
    if (!isDrawing || coordFilled) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onUndo();
    }
  });

  if (!isDrawing && !enableCoordinateInput) return null;

  return (
    <>
      {enableCoordinateInput && geomType && (
        <CoordInput
          draw={draw}
          geomType={geomType}
          open={coordOpen}
          setOpen={setCoordOpen}
          onFilledChange={setCoordFilled}
        />
      )}
      {isDrawing && (
        <>
          <ButtonControl
            order={2}
            onClick={onFinish}
            title={`${gettext("Finish drawing")} (Enter)`}
          >
            <FinishIcon />
          </ButtonControl>

          <ButtonControl
            order={3}
            onClick={onUndo}
            title={`${gettext("Undo last point")} (Backspace / Ctrl+Z)`}
            disabled={!canUndo}
          >
            <UndoIcon />
          </ButtonControl>

          <ButtonControl
            order={4}
            onClick={onCancel}
            title={`${gettext("Cancel drawing")} (Esc)`}
          >
            <CancelIcon />
          </ButtonControl>
        </>
      )}
    </>
  );
}
