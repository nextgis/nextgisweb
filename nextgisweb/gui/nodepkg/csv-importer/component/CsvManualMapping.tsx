import { useMemo } from "react";

import { Select } from "@nextgisweb/gui/antd";
import { Area, Lot } from "@nextgisweb/gui/mayout";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { TargetColumn } from "../type";
import { getMatchingOptions } from "../utils";

import Arrow from "@nextgisweb/icon/material/arrow_forward";

import "../CsvImporter.less";

const msgSelectColumn = gettext("Select column");

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
    <Area labelPosition="top" cols={["1fr"]}>
      {targetColumns.map((targetColumn) => {
        const options = matchingOptions.get(targetColumn) ?? [];
        const csvSelectOptions = [
          ...options.map((idx) => ({
            label: csvColumns[idx],
            value: idx,
          })),
        ];

        return (
          <Lot
            key={targetColumn.key}
            label={
              <>
                <Arrow /> {targetColumn.label}
              </>
            }
          >
            <Select
              style={{ width: "100%" }}
              value={matches.get(targetColumn) ?? undefined}
              options={csvSelectOptions}
              allowClear={true}
              placeholder={msgSelectColumn}
              onChange={(value) => {
                onMatchChange(targetColumn, value ?? undefined);
              }}
            />
          </Lot>
        );
      })}
    </Area>
  );
}
