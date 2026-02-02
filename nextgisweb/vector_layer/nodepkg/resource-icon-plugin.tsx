/** @plugin */

import type { FeatureLayerGeometryType } from "@nextgisweb/feature-layer/type/api";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";
import { registerResourceIcon } from "@nextgisweb/resource/resource-icon/registry";

const cls = "vector_layer";

const geometryTypeIconAliases: Record<
    FeatureLayerGeometryType,
    "line" | "point" | "polygon"
> = {
    POINT: "point",
    LINESTRING: "line",
    POLYGON: "polygon",
    MULTIPOINT: "point",
    MULTILINESTRING: "line",
    MULTIPOLYGON: "polygon",
    POINTZ: "point",
    LINESTRINGZ: "line",
    POLYGONZ: "polygon",
    MULTIPOINTZ: "point",
    MULTILINESTRINGZ: "line",
    MULTIPOLYGONZ: "polygon",
};

registerResourceIcon(COMP_ID, {
    cls,
    icon: ({ item, children }) => {
        const geom = item.get("vector_layer.geometry_type");
        let identity = cls;
        if (geom) {
            const type = geometryTypeIconAliases[geom];
            if (type) {
                identity = [cls, type].join("_");
            }
        }
        return <SvgIcon icon={`rescls-${identity}`}>{children}</SvgIcon>;
    },
    attributes: [["vector_layer.geometry_type"]],
});
