import type { VirtualItem } from "@tanstack/react-virtual";

import { KEY_FIELD_KEYNAME } from "./constant";
import type {
    EffectiveWidths,
    FeatureAttrs,
    FeatureLayerFieldCol,
    SetValue,
} from "./type";
import { renderFeatureFieldValue } from "./util/renderFeatureFieldValue";

interface RowsProps {
    effectiveWidths: EffectiveWidths;
    virtualItems: VirtualItem[];
    rowMinHeight: number;
    selectedIds: number[];
    columns: FeatureLayerFieldCol[];
    data: FeatureAttrs[];
    loadingCol: () => string;
    setSelectedIds: (ids: SetValue<number[]>) => void;
    measureElement: (node: Element | null) => void;
}

export function FeatureTableRows({
    effectiveWidths,
    virtualItems,
    rowMinHeight,
    selectedIds,
    columns,
    data,
    loadingCol,
    measureElement,
    setSelectedIds,
}: RowsProps) {
    const firstVirtual = virtualItems[0];

    if (!firstVirtual) {
        return null;
    }

    const prepareCols = (row?: FeatureAttrs) => {
        return (
            <>
                {columns.map((f) => {
                    const val = row && row[f.keyname];
                    const renderValue =
                        val !== undefined
                            ? renderFeatureFieldValue(f, val)
                            : loadingCol();
                    return (
                        <div
                            key={f.id}
                            className="td"
                            style={{
                                width: `${effectiveWidths[f.id]}px`,
                            }}
                        >
                            {renderValue}
                        </div>
                    );
                })}
            </>
        );
    };

    return (
        <>
            {virtualItems.map((virtualRow) => {
                let selectedKey: number | undefined = undefined;
                let className = "tr";

                const row = data.find((d) => d.__rowIndex === virtualRow.index);
                if (row) {
                    selectedKey = selectedIds.find(
                        (s) => s === row[KEY_FIELD_KEYNAME]
                    );
                }

                if (selectedKey) {
                    className += " selected";
                }
                return (
                    <div
                        key={virtualRow.key}
                        className={className}
                        data-index={virtualRow.index}
                        ref={measureElement}
                        style={{
                            minHeight: `${rowMinHeight}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                        }}
                        onClick={() => {
                            setSelectedIds((old) => {
                                if (selectedKey) {
                                    return old.filter((o) => o !== selectedKey);
                                } else if (row) {
                                    const newId = row[
                                        KEY_FIELD_KEYNAME
                                    ] as number;
                                    return [newId];
                                }
                                return old;
                            });
                        }}
                    >
                        {prepareCols(row)}
                    </div>
                );
            })}
        </>
    );
}
