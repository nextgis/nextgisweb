import { observer } from "mobx-react-lite";
import { useCallback } from "react";

import { LayersTree } from "../../layers-tree/LayersTree";
import { PanelContainer } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import { BasemapSelector } from "./BasemapSelector";
import { LayersDropdown } from "./LayersDropdown";

import "./LayersPanel.less";

const LayersPanel = observer<PanelPluginWidgetProps>(
    ({ store, display, ...props }) => {
        const onSelect = useCallback(
            (keys: number[]) => {
                display.handleSelect(keys);
            },
            [display]
        );

        return (
            <PanelContainer
                title={
                    <>
                        {store.title}
                        <LayersDropdown display={display} />
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
                    store={display.treeStore}
                    onSelect={onSelect}
                    {...props}
                />
            </PanelContainer>
        );
    }
);

LayersPanel.displayName = "LayersPanel";
export default LayersPanel;
