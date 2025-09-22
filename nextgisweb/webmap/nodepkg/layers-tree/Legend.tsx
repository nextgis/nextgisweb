import { useMemo } from "react";

import { Checkbox, ConfigProvider, useToken } from "@nextgisweb/gui/antd";

import type { WebmapStore } from "../store";
import type { TreeItemConfig } from "../type/TreeItems";
import { restoreSymbols } from "../utils/symbolsIntervals";
import "./Legend.less";

interface LegendProps {
    nodeData: TreeItemConfig;
    store: WebmapStore;
    checkable: boolean;
}

export function Legend({ nodeData, store, checkable }: LegendProps) {
    const { token } = useToken();

    const legendInfo = "legendInfo" in nodeData && nodeData.legendInfo;

    const intervals = useMemo<
        Record<number, boolean> | "-1" | undefined
    >(() => {
        const storeItem = store.getStoreItem(nodeData.id);
        if (storeItem && storeItem.type === "layer") {
            if (Array.isArray(storeItem.symbols)) {
                return restoreSymbols(storeItem.symbols);
            } else if (storeItem.symbols === "-1") {
                return "-1";
            }
        }
    }, [nodeData.id, store]);

    if (!nodeData || !legendInfo || !legendInfo.open) {
        return <></>;
    }

    const blockClassName = checkable ? "checkable" : "uncheckable";
    return (
        <div className={`legend-block ${blockClassName}`}>
            <ConfigProvider
                theme={{
                    components: {
                        Checkbox: {
                            colorPrimary: token.colorWhite,
                            colorPrimaryHover: token.colorWhite,
                            colorWhite: token.colorPrimary,
                        },
                    },
                }}
            >
                {legendInfo.symbols?.map((s, idx) => {
                    const id = nodeData.id;

                    const render =
                        intervals === "-1"
                            ? false
                            : intervals
                              ? !!intervals[s.index]
                              : s.render;

                    let checkbox;
                    if (checkable) {
                        checkbox =
                            render !== null ? (
                                <Checkbox
                                    style={{ width: "16px" }}
                                    defaultChecked={render}
                                    onChange={(e) => {
                                        store.setLayerLegendSymbol(
                                            id,
                                            s.index,
                                            e.target.checked
                                        );
                                    }}
                                    onClick={(evt) => evt.stopPropagation()}
                                />
                            ) : (
                                <div style={{ flex: "0 0 16px" }} />
                            );
                    }

                    return (
                        <div
                            key={idx}
                            className="legend-symbol"
                            title={s.display_name}
                        >
                            {checkbox}
                            <img
                                width={20}
                                height={20}
                                src={"data:image/png;base64," + s.icon.data}
                            />
                            <div className="legend-title">{s.display_name}</div>
                        </div>
                    );
                })}
            </ConfigProvider>
        </div>
    );
}
