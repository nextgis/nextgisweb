/** @plugin */

import { registry } from "@nextgisweb/resource/resource-section/easy-create/registry";

registry.register(COMP_ID, {
    match: (file) => {
        const ext = file.name.split(".").pop()?.toLowerCase();
        // TODO: get allowed format from settings
        return ["geojson", "gpkg", "gml", "kml", "csv", "xlsx"].includes(
            ext || ""
        );
    },
    getCreator: () =>
        import("./vectorLayerEasyCreator").then((mod) => mod.default),
});
