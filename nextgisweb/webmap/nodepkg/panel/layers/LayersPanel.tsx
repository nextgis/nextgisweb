import type { PanelComponentProps } from "@nextgisweb/webmap/panels-manager/type";
import type ZoomToWebmapPlugin from "@nextgisweb/webmap/plugin/zoom-to-webmap";

import { LayersTree } from "../../layers-tree/LayersTree";
import { PanelContainer } from "../component";

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
            epilog={<BasemapSelector display={display} />}
            components={{
                content: PanelContainer.Unpadded,
                epilog: PanelContainer.Unpadded,
            }}
        >
            <LayersTree
                store={display.webmapStore}
                onSelect={display.handleSelect.bind(display)}
                setLayerZIndex={display.setLayerZIndex.bind(display)}
                getWebmapPlugins={() => ({ ...display._plugins })}
                {...props}
            />
        </PanelContainer>
    );
}
