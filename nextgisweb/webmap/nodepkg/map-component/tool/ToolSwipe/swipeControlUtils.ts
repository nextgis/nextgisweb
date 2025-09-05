import type RenderEvent from "ol/render/Event";

import type { Orientation } from "./SwipeControl";

export function postcompose(e: RenderEvent) {
    const restore = () => {
        if (e.context && "restore" in e.context) (e.context as any).restore();
    };
    // restore context when decluttering is done
    // https://github.com/openlayers/openlayers/issues/10096
    if (
        e.target.getClassName?.() !== "ol-layer" &&
        e.target.get?.("declutter")
    ) {
        setTimeout(restore, 0);
    } else {
        restore();
    }
}

export function precompose(
    e: RenderEvent,
    {
        orientation,
        isReversed,
        position,
    }: { orientation: Orientation; isReversed: boolean; position: number }
) {
    const ctx = e.context;
    if (ctx && "beginPath" in ctx) {
        const { width, height } = ctx.canvas;
        const isVertical = orientation === "vertical";

        const maskPosition = isReversed ? 1 - position : position;

        const [x, y, w, h] = [
            isVertical ? (isReversed ? width - width * maskPosition : 0) : 0,
            isVertical ? 0 : isReversed ? height - height * maskPosition : 0,
            isVertical ? width * maskPosition : width,
            isVertical ? height : height * maskPosition,
        ];

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
    }
}
