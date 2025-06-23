import { Tooltip } from "antd";
import { observer } from "mobx-react-lite";

import { gettext } from "@nextgisweb/pyramid/i18n";
import type ZoomToWebmapPlugin from "@nextgisweb/webmap/plugin/zoom-to-webmap";

import { LayersTree } from "../../layers-tree/LayersTree";
import { PanelContainer } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import { BasemapSelector } from "./BasemapSelector";
import { LayersDropdown } from "./LayersDropdown";

import AttentionIcon from "@nextgisweb/icon/material/error/outline";

import "./LayersPanel.less";

const LayersPanel = observer<PanelPluginWidgetProps>(
    ({ store, display, ...props }) => {
        const zoomToAllLayers = () => {
            const plugin =
                display.plugins["@nextgisweb/webmap/plugin/zoom-to-webmap"];
            if (plugin) {
                (plugin as ZoomToWebmapPlugin).zoomToAllLayers();
            }
        };

        const selectableBlock = store.display.webmapStore.selectableBlock;

        return (
            <PanelContainer
                title={
                    <>
                        {store.title}
                        <LayersDropdown
                            onClick={(key) => {
                                if (key === "zoomToAllLayers") {
                                    zoomToAllLayers();
                                }
                            }}
                        />
                        {!!selectableBlock.length && (
                            <Tooltip
                                title={() => {
                                    const reasonPart = selectableBlock
                                        .map((item) => item.reason)
                                        .join(", ");
                                    const hasUnblockAction =
                                        selectableBlock.some(
                                            (item) => item.unblock
                                        );
                                    return (
                                        <>
                                            {reasonPart}
                                            {hasUnblockAction && (
                                                <div>
                                                    {gettext(
                                                        "Click for unblock"
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    );
                                }}
                            >
                                <AttentionIcon
                                    onClick={() => {
                                        store.display.webmapStore.clearSelectableBlock();
                                    }}
                                />
                            </Tooltip>
                        )}
                    </>
                }
                close={store.close}
                epilog={<BasemapSelector map={display.map} />}
                components={{
                    content: PanelContainer.Unpadded,
                    epilog: PanelContainer.Unpadded,
                }}
            >
                <LayersTree
                    store={display.webmapStore}
                    onSelect={display.handleSelect.bind(display)}
                    setLayerZIndex={display.map.setLayerZIndex.bind(display)}
                    getWebmapPlugins={() => ({ ...display.plugins })}
                    {...props}
                />
            </PanelContainer>
        );
    }
);

LayersPanel.displayName = "LayersPanel";
export default LayersPanel;
