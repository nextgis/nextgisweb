import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { Checkbox, ConfigProvider, useToken } from "@nextgisweb/gui/antd";
import type { LegendSymbol as NGWLegendSymbol } from "@nextgisweb/render/type/api";

import type { TreeLayerStore } from "../store/tree-store/TreeItemStore";
import { restoreSymbols } from "../utils/symbolsIntervals";

import "./Legend.less";

interface LegendProps {
    nodeData: TreeLayerStore;
    checkable: boolean;
}

interface LegendSymbolProps {
    render: boolean | null;
    symbol: NGWLegendSymbol;
    nodeData: TreeLayerStore;
    checkable: boolean;
}

const LegendSymbol = observer(
    ({ render, symbol, nodeData, checkable }: LegendSymbolProps) => {
        if (!render && !checkable) {
            return null;
        }
        const { opacity } = nodeData;
        let checkbox;
        if (checkable) {
            checkbox =
                render !== null ? (
                    <Checkbox
                        style={{ width: "16px" }}
                        defaultChecked={render}
                        onChange={(e) => {
                            nodeData.setLayerLegendSymbol(
                                symbol.index,
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
            <div className="legend-symbol" title={symbol.display_name}>
                {checkbox}
                <img
                    width={20}
                    height={20}
                    src={"data:image/png;base64," + symbol.icon.data}
                    style={{ opacity: opacity ?? undefined }}
                />
                <div className="legend-title">{symbol.display_name}</div>
            </div>
        );
    }
);

LegendSymbol.displayName = "LegendSymbol";

export const Legend = observer(({ nodeData, checkable }: LegendProps) => {
    const { token } = useToken();

    const { legendInfo } = nodeData;

    const intervals = useMemo<
        Record<number, boolean> | "-1" | undefined
    >(() => {
        if (nodeData && nodeData.isLayer()) {
            if (Array.isArray(nodeData.symbols)) {
                return restoreSymbols(nodeData.symbols);
            } else if (nodeData.symbols === "-1") {
                return "-1";
            }
        }
    }, [nodeData]);

    if (!legendInfo.open) {
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
                    const render =
                        intervals === "-1"
                            ? false
                            : intervals
                              ? !!intervals[s.index]
                              : s.render;

                    return (
                        <LegendSymbol
                            key={idx}
                            symbol={s}
                            checkable={checkable}
                            render={render}
                            nodeData={nodeData}
                        />
                    );
                })}
            </ConfigProvider>
        </div>
    );
});

Legend.displayName = "Legend";
