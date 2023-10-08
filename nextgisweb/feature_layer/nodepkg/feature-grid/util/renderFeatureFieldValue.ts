import { utc } from "@nextgisweb/gui/dayjs";

import type { NgwAttributeType } from "../../type";
import type { FeatureLayerDataType } from "../../type/FeatureLayer";

export function renderFeatureFieldValue(
    { datatype }: { datatype: FeatureLayerDataType },
    val: NgwAttributeType
): string | number | null {
    if (val) {
        if (datatype === "DATETIME") {
            return utc(new Date(val as string))
                .local()
                .format("L LTS");
        } else if (datatype === "DATE") {
            return utc(new Date(val as string))
                .local()
                .format("L");
        } else if (datatype === "TIME") {
            const dt = new Date(`1970-01-01T${val}`);
            return utc(dt).local().format("LTS");
        }
    }
    return val as string | number | null;
}
