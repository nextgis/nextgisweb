import type { VirtualItem } from "@tanstack/react-virtual";
import classNames from "classnames";
import { useMemo } from "react";
import type { Key, ReactNode } from "react";

import { utc } from "@nextgisweb/gui/dayjs";
import { useRouteGet } from "@nextgisweb/pyramid/hook";

import { $FID, $VID, KEY_FIELD_ID, LAST_CHANGED_FIELD_ID } from "./constant";
import type {
    EffectiveWidths,
    FeatureAttrs,
    FeatureLayerFieldCol,
    SetValue,
} from "./type";
import { renderFeatureFieldValue } from "./util/renderFeatureFieldValue";

interface VersionProps {
    resourceId: number;
    versionId: number;
}

function VersionCell({ resourceId, versionId }: VersionProps) {
    const { data } = useRouteGet(
        "feature_layer.version.item",
        {
            id: resourceId,
            vid: versionId,
        },
        { cache: true }
    );

    const tstamp = useMemo(() => {
        if (!data || !data.tstamp) return;
        return utc(data.tstamp).local().format("L LTS");
    }, [data]);

    if (!data || !tstamp) return <></>;
    return (
        <>
            {tstamp}
            {data.user && <>, {data.user.display_name}</>}
        </>
    );
}

interface RowsProps {
    resourceId: number;
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
    resourceId,
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
                    let renderValue: ReactNode;
                    let cellClassName;
                    if (!row) {
                        renderValue = loadingCol();
                    } else if (f.id === KEY_FIELD_ID) {
                        cellClassName = "id";
                        renderValue = String(row[$FID]);
                    } else if (f.id === LAST_CHANGED_FIELD_ID) {
                        cellClassName = "last-changed";
                        renderValue = (
                            <VersionCell
                                resourceId={resourceId}
                                versionId={row[$VID]!}
                            />
                        );
                    } else if (f.keyname) {
                        const val = row[f.keyname];
                        renderValue =
                            val !== undefined
                                ? renderFeatureFieldValue(f, val)
                                : loadingCol();
                    }

                    return (
                        <div
                            key={f.id}
                            className={classNames("td", cellClassName)}
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
                    selectedKey = selectedIds.find((s) => s === row[$FID]);
                }

                if (selectedKey) {
                    className += " selected";
                }
                return (
                    <div
                        key={virtualRow.key as Key}
                        className={className}
                        data-index={virtualRow.index}
                        ref={measureElement}
                        style={{
                            minHeight: `${rowMinHeight}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                        }}
                        onClick={(e) => {
                            // When you finish selecting text in a single row, it triggers a click event.
                            // However, when selecting text across multiple rows, no click event is triggered.
                            // The following technique is used to prevent the click event from firing during text selection within a single row.
                            const selection = window.getSelection();
                            if (selection && selection.toString().length > 0) {
                                e.preventDefault();
                                return;
                            }
                            setSelectedIds((old) => {
                                if (selectedKey) {
                                    return old.filter((o) => o !== selectedKey);
                                } else if (row) {
                                    const newId = row[$FID];
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
