import type { PanelComponentProps } from "@nextgisweb/webmap/panels-manager/type";
import type ZoomToWebmapPlugin from "@nextgisweb/webmap/plugin/zoom-to-webmap";

import { LayersTree } from "../../layers-tree/LayersTree";
import { PanelHeader } from "../header";

import { BasemapSelector } from "./BasemapSelector";
import { LayersDropdown } from "./LayersDropdown";

import "./LayersPanel.less";

export default function LayersPanel({
    title,
    close,
    display,
    ...props
}: PanelComponentProps) {
    const zoomToAllLayers = () => {
        const plugin =
            display._plugins["@nextgisweb/webmap/plugin/zoom-to-webmap"];
        if (plugin) {
            (plugin as ZoomToWebmapPlugin).zoomToAllLayers();
        }
    };

    return (
        <div className="ngw-webmap-layers-panel">
            <PanelHeader title={title} close={close}>
                <LayersDropdown
                    onClick={(key) => {
                        if (key === "zoomToAllLayers") {
                            zoomToAllLayers();
                        }
                    }}
                />
            </PanelHeader>
            <LayersTree
                store={display.webmapStore}
                onSelect={display.handleSelect.bind(display)}
                setLayerZIndex={display.setLayerZIndex.bind(display)}
                getWebmapPlugins={() => ({ ...display._plugins })}
                {...props}
            />
            <div className="basemap">
                <BasemapSelector display={display} />
            </div>
        </div>
    );
}
