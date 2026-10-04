import type { GridAggregation } from "../../fields-widget/FieldsStore";
import type { AggregationResult } from "../hook/useGridAggregation";
import type { FeatureLayerFieldCol } from "../type";

import { AggrCol } from "./AggrCol";

interface AggrColsProps {
  columns: FeatureLayerFieldCol[];
  userDefinedWidths: Record<number, number>;
  aggrValues: Map<number, AggregationResult>;
  modeOverrides: Map<number, GridAggregation>;
  scrollBarSize: number;
  onModeChange: (fieldId: number, mode: GridAggregation) => void;
}

export function AggrCols({
  columns,
  userDefinedWidths,
  aggrValues,
  modeOverrides,
  scrollBarSize,
  onModeChange,
}: AggrColsProps) {
  return (
    <>
      {columns.map((column) => (
        <AggrCol
          key={column.id}
          column={column}
          userDefinedWidths={userDefinedWidths}
          aggr={aggrValues.get(column.id)}
          mode={
            modeOverrides.get(column.id) ?? column.grid_aggregation ?? "sum"
          }
          onModeChange={onModeChange}
        />
      ))}
      <div key="scrollbar" style={{ flex: `0 0 ${scrollBarSize}px` }} />
    </>
  );
}
