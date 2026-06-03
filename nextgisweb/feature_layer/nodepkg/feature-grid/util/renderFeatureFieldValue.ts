import type { FeatureLayerFieldDatatype } from "@nextgisweb/feature-layer/type/api";
import { utc } from "@nextgisweb/gui/dayjs";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { NgwAttributeType } from "../../type";

export function renderFeatureFieldValue(
  { datatype }: { datatype: FeatureLayerFieldDatatype },
  val: NgwAttributeType
): string | number | null {
  if (val !== null && val !== undefined) {
    if (datatype === "JSON") {
      return JSON.stringify(val);
    } else if (datatype === "BOOLEAN") {
      return val ? gettext("True") : gettext("False");
    } else if (datatype === "DATETIME") {
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
