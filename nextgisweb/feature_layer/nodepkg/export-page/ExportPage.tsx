import { useState } from "react";

import { ExportForm } from "../export-form/ExportForm";
import type { ExportFormProps } from "../export-form/ExportForm";
import type { FilterExpressionString } from "../feature-filter/type";

export function ExportPage(props: Omit<ExportFormProps, "params">) {
  const [params] = useState(() => {
    const {
      resources: resStr,
      fields: fieldsStr,
      filter: filterStr,
      ...rest
    } = Object.fromEntries(new URL(location.href).searchParams.entries());
    const urlParams: Record<string, string | number[]> = { ...rest };
    if (resStr) {
      urlParams.resources = resStr.split(",").map(Number);
    }
    if (fieldsStr) {
      urlParams.fields = fieldsStr.split(",").map(Number);
    }
    return {
      ...urlParams,
      filter: filterStr ? (filterStr as FilterExpressionString) : undefined,
    };
  });

  return <ExportForm {...props} params={params} />;
}
