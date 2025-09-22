import { unByKey } from "ol/Observable";
import type { Draw } from "ol/interaction";
import { useCallback, useEffect, useState } from "react";

import { useKeydownListener } from "@nextgisweb/gui/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { ButtonControl } from "@nextgisweb/webmap/map-component";

import FinishIcon from "@nextgisweb/icon/material/check";
import CancelIcon from "@nextgisweb/icon/material/close";
import UndoIcon from "@nextgisweb/icon/material/undo";

export function DrawControl({ draw }: { draw: Draw }) {
    const [isDrawing, setIsDrawing] = useState(false);
    const [canUndo, setCanUndo] = useState(false);

    useEffect(() => {
        const onStart = () => {
            setIsDrawing(true);
            setCanUndo(true);
        };
        const onEnd = () => {
            setIsDrawing(false);
            setCanUndo(false);
        };

        const keyStart = draw.on("drawstart", onStart);
        const keyAbort = draw.on("drawabort", onEnd);
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
        (e) => isDrawing && (e.preventDefault(), onFinish())
    );
    useKeydownListener(
        "Escape",
        (e) => isDrawing && (e.preventDefault(), onCancel())
    );
    useKeydownListener(
        "Backspace",
        (e) => isDrawing && (e.preventDefault(), onUndo())
    );
    useKeydownListener("z", (e) => {
        if (!isDrawing) return;
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onUndo();
        }
    });

    if (!isDrawing) return null;

    return (
        <>
            <ButtonControl
                onClick={onFinish}
                title={`${gettext("Finish drawing")} (Enter)`}
            >
                <FinishIcon />
            </ButtonControl>

            <ButtonControl
                onClick={onUndo}
                title={`${gettext("Undo last point")} (Backspace / Ctrl+Z)`}
                disabled={!canUndo}
            >
                <UndoIcon />
            </ButtonControl>

            <ButtonControl
                onClick={onCancel}
                title={`${gettext("Cancel drawing")} (Esc)`}
            >
                <CancelIcon />
            </ButtonControl>
        </>
    );
}
