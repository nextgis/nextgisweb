import { LayersTree } from "../../layers-tree/LayersTree";
import { PanelContainer } from "../component";

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
        <PanelContainer
            title={
                <>
                    {title}
                    <LayersDropdown
                        onClick={(key) => {
                            if (key === "zoomToAllLayers") {
                                zoomToAllLayers();
                            }
                        }}
                    />
                </>
            }
            close={close}
            epilog={
                <BasemapSelector
                    {...{
                        map: display.map,
                        basemapDefault: display._getActiveBasemapKey(),
                        onChange: (key) => display._switchBasemap(key),
                    }}
                />
            }
            components={{
                content: PanelContainer.Unpadded,
                epilog: PanelContainer.Unpadded,
            }}
        >
            <LayersTree
                {...{
                    store: display.webmapStore,
                    onSelect: display.handleSelect.bind(display),
                    setLayerZIndex: display.setLayerZIndex.bind(display),
                    getWebmapPlugins: () => ({ ...display._plugins }),
                    ...props,
                }}
            />
        </PanelContainer>
    );
}
