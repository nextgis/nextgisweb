import { utc } from "@nextgisweb/gui/dayjs";

import type { FeatureLayerDataType } from "../../type/FeatureLayer";

export function renderFeatureFieldValue(
    { datatype }: { datatype: FeatureLayerDataType },
    val: string
): string {
    if (val) {
        if (datatype === "DATETIME") {
            return utc(new Date(val)).local().format("L LTS");
        } else if (datatype === "DATE") {
            return utc(new Date(val)).local().format("L");
        } else if (datatype === "TIME") {
            const dt = new Date(`1970-01-01T${val}`);
            return utc(dt).local().format("LTS");
        }
    }
    return val;
}
