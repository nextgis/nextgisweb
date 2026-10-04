import { Dropdown, Spin } from "@nextgisweb/gui/antd";
import { ExpandableText } from "@nextgisweb/gui/index";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { GridAggregation } from "../../fields-widget/FieldsStore";
import type { AggregationResult } from "../hook/useGridAggregation";
import type { FeatureLayerFieldCol } from "../type";
import { getColumnStyle } from "../util/getColumnStyle";

import MoreVertIcon from "@nextgisweb/icon/material/more_vert";

const MODE_LABEL: Record<GridAggregation, string> = {
  sum: gettext("Sum"),
  min: gettext("Min"),
  max: gettext("Max"),
};

const MODES: GridAggregation[] = ["sum", "min", "max"];

interface AggrColProps {
  column: FeatureLayerFieldCol;
  userDefinedWidths: Record<number, number>;
  aggr: AggregationResult | undefined;
  mode: GridAggregation;
  onModeChange: (fieldId: number, mode: GridAggregation) => void;
}

export function AggrCol({
  column,
  userDefinedWidths,
  aggr,
  mode,
  onModeChange,
}: AggrColProps) {
  const { id, grid_aggregation } = column;

  const style = getColumnStyle(column, userDefinedWidths);

  if (grid_aggregation === null) {
    return <div className="aggr" style={style} />;
  }

  const menuItems = MODES.map((m) => ({
    key: m,
    label: MODE_LABEL[m],
    onClick: () => onModeChange(id, m),
  }));

  const loading = !aggr || aggr.mode !== mode;
  const empty = !loading && aggr.value === null;

  return (
    <div className="aggr" style={style}>
      <span className="aggr-value">
        <ExpandableText maxLines={1} tooltip={!loading && !empty}>
          {loading ? (
            <Spin size="small" />
          ) : empty ? null : (
            `${MODE_LABEL[mode]}: ${aggr.value}`
          )}
        </ExpandableText>
      </span>
      {!empty && (
        <Dropdown
          menu={{ items: menuItems, selectedKeys: [mode] }}
          trigger={["click"]}
        >
          <a
            className="aggr-trigger"
            onClick={(e) => e.stopPropagation()}
            title={MODE_LABEL[mode]}
          >
            <MoreVertIcon />
          </a>
        </Dropdown>
      )}
    </div>
  );
}
