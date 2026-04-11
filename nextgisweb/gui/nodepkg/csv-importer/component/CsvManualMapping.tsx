import { useMemo } from "react";

import { Select, Tooltip } from "@nextgisweb/gui/antd";
import { HelpIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { TargetColumn } from "../type";
import { getMatchingOptions } from "../utils";

import Arrow from "@nextgisweb/icon/material/arrow_forward";

import "../CsvImporter.less";

const msgUnsetValue = gettext("Unset");
const msgAutoDetected = gettext("This field can be auto-mapped by");

interface CsvManualMappingProps {
  targetColumns: TargetColumn[];
  csvColumns: string[];
  matches: Map<TargetColumn, number>;
  onMatchChange: (target: TargetColumn, csv: number | undefined) => void;
}

export function CsvManualMapping({
  targetColumns,
  csvColumns,
  matches,
  onMatchChange,
}: CsvManualMappingProps) {
  const matchingOptions = useMemo(
    () =>
      csvColumns
        ? getMatchingOptions(targetColumns, csvColumns, matches)
        : new Map<TargetColumn, number[]>(),
    [targetColumns, csvColumns, matches]
  );

  return (
    <div className="csv-manual-mapping">
      {targetColumns.map((targetColumn) => {
        const currentMatch = matches.get(targetColumn);

        const options = matchingOptions.get(targetColumn) ?? [];
        const csvSelectOptions = [
          { label: msgUnsetValue, value: -1, className: "unset" },
          ...options.map((idx) => ({
            label: csvColumns[idx],
            value: idx,
          })),
        ];

        return (
          <div key={targetColumn.key} className="column">
            <div className="header">
              <Arrow />
              <div className="value">{targetColumn.label}</div>
              <Tooltip
                title={`${msgAutoDetected}: ${targetColumn.aliases.map((alias) => `"${alias}"`).join(", ")}`}
              >
                <HelpIcon />
              </Tooltip>
            </div>
            <Select
              className="select"
              value={currentMatch !== undefined ? currentMatch : -1}
              onChange={(value) => {
                onMatchChange(targetColumn, value === -1 ? undefined : value);
              }}
              options={csvSelectOptions}
            />
          </div>
        );
      })}
    </div>
  );
}
