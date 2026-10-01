import { useCallback, useEffect, useState } from "react";

import type { MinMaxSpec, SumSpec } from "@nextgisweb/feature-layer/type/api";
import { isAbortError } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";

import type { FeatureLayerFieldCol } from "../type";

import type { QueryParams } from "./useFeatureTable";

export interface UseGridAggregationProps {
  resourceId: number;
  columns: FeatureLayerFieldCol[];
  showGridAggregation: boolean;
  queryParams?: QueryParams;
  version?: number;
}

export function useGridAggregation({
  resourceId,
  columns,
  showGridAggregation,
  queryParams,
  version,
}: UseGridAggregationProps): Map<number, number> {
  const [aggrValues, setAggrValues] = useState<Map<number, number>>(
    () => new Map()
  );
  const { makeSignal, abort } = useAbortController();

  const fetchAggregation = useCallback(async () => {
    const aggrColumns = columns.filter((c) => c.grid_aggregation !== null);

    abort();

    if (!showGridAggregation || aggrColumns.length === 0) {
      setAggrValues(new Map());
      return;
    }

    const signal = makeSignal();
    const items = aggrColumns.map(
      (col) =>
        ({
          type: ["min", "max"].includes(col.grid_aggregation!)
            ? "min_max"
            : "sum",
          field: col.id,
        }) as MinMaxSpec | SumSpec
    );

    const filterParts = [];
    if (queryParams?.filter) {
      filterParts.push(JSON.parse(queryParams.filter));
    }
    if (queryParams?.like) {
      filterParts.push([
        "text_search",
        queryParams.like,
        { case_sensitive: true },
      ]);
    } else if (queryParams?.ilike) {
      filterParts.push(["text_search", queryParams.ilike]);
    }
    let filter;
    if (filterParts.length === 1) {
      filter = filterParts[0];
    } else if (filterParts.length > 1) {
      filter = ["all", ...filterParts];
    }

    try {
      const response = await route("feature_layer.aggregate", resourceId).post({
        json: {
          items,
          ...(filter !== undefined ? { filter } : {}),
          ...(queryParams?.intersects
            ? { intersects: queryParams.intersects }
            : {}),
        },
        signal,
      });

      const values = new Map<number, number>();
      aggrColumns.forEach((col, i) => {
        const result = response.items[i];
        if (result.type === "min_max") {
          const value =
            col.grid_aggregation === "max" ? result.max : result.min;
          if (value !== null) values.set(col.id, value);
        } else if (result.type === "sum") {
          if (result.sum !== null) values.set(col.id, result.sum);
        }
      });
      setAggrValues(values);
    } catch (err) {
      if (!isAbortError(err)) throw err;
    }
  }, [
    columns,
    resourceId,
    showGridAggregation,
    queryParams,
    makeSignal,
    abort,
  ]);

  useEffect(() => {
    fetchAggregation();
  }, [fetchAggregation, version]);

  return aggrValues;
}
