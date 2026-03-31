import dayjs from "dayjs";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";

import type { OperatorValueMap } from "../type";

export const getDefaultValue = <O extends keyof OperatorValueMap>(
  fields: FeatureLayerFieldRead[],
  field: string,
  operator: O
): OperatorValueMap[O] => {
  const fieldInfo = fields.find((f) => f.keyname === field);
  const wantsNoValue = ["is_null", "!is_null"].includes(operator);
  const wantsArray = ["in", "!in"].includes(operator);

  let defaultValue = undefined;

  if (wantsArray) {
    defaultValue = [];
  } else if (!wantsNoValue && fieldInfo) {
    if (wantsArray) {
      defaultValue = [];
    } else {
      switch (fieldInfo.datatype) {
        case "INTEGER":
        case "REAL":
          defaultValue = 0;
          break;
        case "BIGINT":
          defaultValue = "0";
          break;
        case "STRING":
          defaultValue = "";
          break;
        case "DATE":
          defaultValue = dayjs().format("YYYY-MM-DD");
          break;
        case "TIME":
          defaultValue = dayjs().format("HH:mm:ss");
          break;
        case "DATETIME":
          defaultValue = dayjs().format("YYYY-MM-DDTHH:mm:ss");
          break;
        default:
          defaultValue = undefined;
      }
    }
  }
  return defaultValue as OperatorValueMap[O];
};
