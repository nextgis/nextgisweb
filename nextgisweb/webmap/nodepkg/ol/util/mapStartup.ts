import type Map from "ol/Map";
import type { Size } from "ol/size";

import type { RequestQueue } from "@nextgisweb/pyramid/util";

export function mapStartup({
    olMap,
    queue,
}: {
    olMap: Map;
    queue: RequestQueue;
}) {
    let lastSize: Size | undefined = olMap.getSize();

    const onMoveStart = () => {
        const newSize = olMap.getSize();
        const isSameSize =
            lastSize &&
            newSize &&
            newSize[0] === lastSize[0] &&
            newSize[1] === lastSize[1];

        if (isSameSize) {
            queue.abort();
        } else {
            queue.pause(queue.debounce);
        }
        lastSize = newSize;
    };

    olMap.on("movestart", onMoveStart);

    return () => {
        olMap.un("movestart", onMoveStart);
    };
}
