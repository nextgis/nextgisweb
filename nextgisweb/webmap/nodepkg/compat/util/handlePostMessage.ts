import type { Display } from "@nextgisweb/webmap/display";
import type { Position } from "@nextgisweb/webmap/ol/MapStore";

type TransformedPosition = {
    zoom: number;
    lat: number;
    lon: number;
};

type Detail = "position" | "zoom" | "move";

const commonOptions: {
    event: string;
    detail?: Detail;
    data?: TransformedPosition;
} = {
    event: "ngMapExtentChanged",
};

const parsePosition = (pos: Position): TransformedPosition => {
    return {
        zoom: pos.zoom,
        lat: pos.center[1],
        lon: pos.center[0],
    };
};

/**
 * Generate window `message` events to listen from iframe
 * @example
 * window.addEventListener('message', function(evt) {
 *    const data = evt.data;
 *    if (data.event === 'ngMapExtentChanged') {
 *        if (data.detail === 'zoom') {
 *        } else if (data.detail === 'move') {
 *        }
 *        // OR
 *        if (data.detail === 'position') {}
 *    }
 * }, false);
 */
export function handlePostMessage(
    display: Display,
    newPosition: Position | null,
    oldPosition: Position | null
) {
    const parent = window.parent;

    if (
        display.urlParams.events === "true" &&
        parent &&
        typeof parent.postMessage === "function"
    ) {
        if (!newPosition) {
            return;
        }
        const oldParsedPosition = oldPosition
            ? parsePosition(oldPosition)
            : ({} as Partial<TransformedPosition>);
        const newParsedPosition = parsePosition(newPosition);
        // set array of position part to compare between old and new state
        const events: { params: string[]; name: Detail }[] = [
            { params: ["lat", "lon"], name: "move" },
            { params: ["zoom"], name: "zoom" },
        ];
        const transformPosition = display.map.getPosition(
            display.lonlatProjection
        );
        // prepare to send transform position
        commonOptions.data = parsePosition(transformPosition);
        events.forEach((event) => {
            const isChange = event.params.some(
                (p) =>
                    oldParsedPosition[p as keyof TransformedPosition] !==
                    newParsedPosition[p as keyof TransformedPosition]
            );
            if (isChange) {
                commonOptions.detail = event.name;
                // message should be a string to work correctly with all browsers and systems
                parent.postMessage(JSON.stringify(commonOptions), "*");
            }
        });
        // on any position change
        commonOptions.detail = "position";
        parent.postMessage(JSON.stringify(commonOptions), "*");
    }
}
