import { useCallback, useEffect, useRef, useState } from "react";

import type { MinMaxSpec, SumSpec } from "@nextgisweb/feature-layer/type/api";
import { isAbortError } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";

import type { GridAggregation } from "../../fields-widget/FieldsStore";
import type { FeatureLayerFieldCol } from "../type";

import type { QueryParams } from "./useFeatureTable";

export interface AggregationResult {
  mode: GridAggregation;
  value: number | null;
}

export interface UseGridAggregationProps {
  resourceId: number;
  columns: FeatureLayerFieldCol[];
  showGridAggregation: boolean;
  modeOverrides: Map<number, GridAggregation>;
  queryParams?: QueryParams;
  version?: number;
}

type AggrColumn = { col: FeatureLayerFieldCol; mode: GridAggregation };

export function useGridAggregation({
  resourceId,
  columns,
  showGridAggregation,
  modeOverrides,
  queryParams,
  version,
}: UseGridAggregationProps): Map<number, AggregationResult> {
  const [aggrValues, setAggrValues] = useState<Map<number, AggregationResult>>(
    () => new Map()
  );
  const { makeSignal, abort } = useAbortController();

  const cacheRef = useRef(
    new Map<number, Partial<Record<GridAggregation, number | null>>>()
  );

  const resolveFromCache = useCallback((aggrColumns: AggrColumn[]) => {
    const resolved = new Map<number, AggregationResult>();
    for (const { col, mode } of aggrColumns) {
      const value = cacheRef.current.get(col.id)?.[mode];
      if (value !== undefined) resolved.set(col.id, { mode, value });
    }
    return resolved;
  }, []);

  const fetchAggregation = useCallback(async () => {
    const aggrColumns: AggrColumn[] = columns
      .filter((c) => c.grid_aggregation !== null)
      .map((c) => ({
        col: c,
        mode: modeOverrides.get(c.id) ?? c.grid_aggregation ?? "sum",
      }));

    abort();

    if (!showGridAggregation || aggrColumns.length === 0) {
      setAggrValues(new Map());
      return;
    }

    setAggrValues(resolveFromCache(aggrColumns));

    const missing = aggrColumns.filter(
      ({ col, mode }) => cacheRef.current.get(col.id)?.[mode] === undefined
    );
    if (missing.length === 0) return;

    const signal = makeSignal();
    const items = missing.map(
      ({ col, mode }) =>
        ({
          type: mode === "sum" ? "sum" : "min_max",
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

      missing.forEach(({ col, mode }, i) => {
        const result = response.items[i];
        let value: number | null = null;
        if (result.type === "min_max") {
          value = mode === "max" ? result.max : result.min;
        } else if (result.type === "sum") {
          value = result.sum;
        }
        const entry = cacheRef.current.get(col.id) ?? {};
        entry[mode] = value;
        cacheRef.current.set(col.id, entry);
      });
      setAggrValues(resolveFromCache(aggrColumns));
    } catch (err) {
      if (!isAbortError(err)) throw err;
    }
  }, [
    columns,
    resourceId,
    showGridAggregation,
    modeOverrides,
    queryParams,
    makeSignal,
    abort,
    resolveFromCache,
  ]);

  useEffect(() => {
    cacheRef.current = new Map();
  }, [resourceId, queryParams, version]);

  useEffect(() => {
    fetchAggregation();
  }, [fetchAggregation, version]);

  return aggrValues;
}
