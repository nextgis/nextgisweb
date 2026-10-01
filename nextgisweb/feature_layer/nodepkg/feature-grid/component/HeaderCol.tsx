import type { Ref } from "react";

import { Tooltip } from "@nextgisweb/gui/antd";
import { ExpandableText } from "@nextgisweb/gui/index";
import { gettext } from "@nextgisweb/pyramid/i18n";

import SortIcon from "../component/SortIcon";
import { $FID, KEY_FIELD_ID } from "../constant";
import type { ColOrder, FeatureLayerFieldCol, OrderBy } from "../type";

const msgSum = gettext("Sum");
const msgMaxValue = gettext("Max value");
const msgMinValue = gettext("Min value");

function gridAggregationLabel(
  mode: FeatureLayerFieldCol["grid_aggregation"]
): string {
  switch (mode) {
    case "sum":
      return msgSum;
    case "max":
      return msgMaxValue;
    case "min":
      return msgMinValue;
    default:
      return "";
  }
}

interface HeaderColProps {
  ref: Ref<HTMLDivElement>;
  column: FeatureLayerFieldCol;
  orderBy?: OrderBy;
  userDefinedWidths: Record<number, number>;
  showGridAggregation: boolean;
  aggrValue: number | undefined;
  toggleSorting: (field: string | typeof $FID, curOrder?: ColOrder) => void;
}

export function HeaderCol({
  ref,
  column,
  orderBy,
  userDefinedWidths,
  showGridAggregation,
  aggrValue,
  toggleSorting,
}: HeaderColProps) {
  const { keyname, id, display_name: label, flex } = column;

  const colSort = orderBy && orderBy[0] === keyname && orderBy[1];

  const style = userDefinedWidths[id]
    ? { flex: `0 0 ${userDefinedWidths[id]}px` }
    : { flex };

  const onClick =
    id === KEY_FIELD_ID
      ? () => toggleSorting($FID)
      : keyname
        ? () => toggleSorting(keyname)
        : undefined;

  const showAggr = showGridAggregation && aggrValue !== undefined;
  const tooltipTitle = showAggr
    ? `${gridAggregationLabel(column.grid_aggregation)}: ${aggrValue}`
    : undefined;

  const content = (
    <div ref={ref} className="th" style={style} onClick={onClick}>
      <ExpandableText className="label" maxLines={2} tooltip={true}>
        {label}
      </ExpandableText>
      {showAggr && <span>#</span>}
      {colSort && (
        <div className="suffix">
          <SortIcon dir={colSort} />
        </div>
      )}
    </div>
  );

  return <Tooltip title={tooltipTitle}>{content}</Tooltip>;
}
