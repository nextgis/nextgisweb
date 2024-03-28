import { theme } from "antd";

import { Checkbox, ConfigProvider } from "@nextgisweb/gui/antd";

import type WebmapStore from "../store";
import type { TreeItem } from "../type/TreeItems";

import "./Legend.less";

interface LegendProps {
    nodeData: TreeItem;
    store: WebmapStore;
}

const { useToken } = theme;

export function Legend({ nodeData, store }: LegendProps) {
    const { token } = useToken();

    const legendInfo = "legendInfo" in nodeData && nodeData.legendInfo;
    if (!nodeData || !legendInfo || !legendInfo.open) {
        return <></>;
    }

    return (
        <div className="legend-block">
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
                {legendInfo.symbols.map((s, idx) => {
                    const id = nodeData.id;
                    const symbols = store._legendSymbols[id];
                    const render = (symbols && symbols[s.index]) ?? s.render;
                    return (
                        <div
                            key={idx}
                            className="legend-symbol"
                            title={s.display_name}
                        >
                            <Checkbox
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
