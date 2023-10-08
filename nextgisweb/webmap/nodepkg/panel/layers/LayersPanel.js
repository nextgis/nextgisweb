import { LayersTree } from "../../layers-tree/LayersTree";
import { PanelHeader } from "../header";

import { BasemapSelector } from "./BasemapSelector";
import { LayersDropdown } from "./LayersDropdown";

import "./LayersPanel.less";

export function LayersPanel({ title, close, display, ...props }) {
    const zoomToAllLayers = () => {
        const plugin = display._plugins["ngw-webmap/plugin/ZoomToWebmap"];
        if (!plugin) {
            return;
        }
        plugin.zoomToAllLayers();
    };

    return (
        <div className="ngw-webmap-layers-panel">
            <PanelHeader {...{ title, close }}>
                <LayersDropdown
                    onClick={(key) => {
                        if (key === "zoomToAllLayers") {
                            zoomToAllLayers();
                        }
                    }}
                />
            </PanelHeader>
            <LayersTree
                {...{
                    store: display.webmapStore,
                    onSelect: display.handleSelect.bind(display),
                    setLayerZIndex: display.setLayerZIndex.bind(display),
                    getWebmapPlugins: () => ({ ...display._plugins }),
                    ...props,
                }}
            />
            <div className="basemap">
                <BasemapSelector
                    {...{
                        map: display.map,
                        basemapDefault: display._getActiveBasemapKey(),
                        onChange: (key) => display._switchBasemap(key),
                    }}
                />
            </div>
        </div>
    );
}
