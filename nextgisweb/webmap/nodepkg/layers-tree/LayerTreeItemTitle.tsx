import { observer } from "mobx-react-lite";
import { useState } from "react";

import { Col, Row } from "@nextgisweb/gui/antd";

import type { TreeItemStore } from "../store/tree-store/TreeItemStore";

import { DropdownActions } from "./DropdownActions";
import { Legend } from "./Legend";
import { LegendAction } from "./LegendAction";

import "./LayersTree.less";

export interface LayerTreeItemTitleProps {
    treeItem: TreeItemStore;
    checkable: boolean;
    showLegend: boolean;
    showDropdown: boolean;
    onSelect: (keys: number[]) => void;
}

export const LayerTreeItemTitle = observer(
    ({
        treeItem,
        checkable,
        showLegend,
        showDropdown,
        onSelect,
    }: LayerTreeItemTitleProps) => {
        const [moreClickId, setMoreClickId] = useState<number>();
        const [update, setUpdate] = useState(false);

        const shouldActions = showLegend || showDropdown;

        let actions;
        let isOutOfRange = false;
        if (shouldActions) {
            let legendAction;
            if (treeItem.isLayer()) {
                const treeLayer = treeItem;

                isOutOfRange = treeItem.isOutOfRange;
                legendAction = treeLayer.legendInfo.symbols &&
                    treeLayer.legendInfo.symbols.length > 1 &&
                    showLegend && (
                        <LegendAction
                            nodeData={treeItem}
                            onClick={() => setUpdate((prev) => !prev)}
                        />
                    );
            }

            const dropdownAction = showDropdown && (
                <DropdownActions
                    nodeData={treeItem}
                    setMoreClickId={(id) => {
                        if (id !== undefined) {
                            onSelect([id]);
                        }
                        setMoreClickId(id);
                    }}
                    moreClickId={moreClickId}
                    update={update}
                    setUpdate={setUpdate}
                />
            );
            actions = (
                <Col
                    className="tree-item-action"
                    style={{ alignItems: "center" }}
                >
                    {legendAction}
                    {dropdownAction}
                </Col>
            );
        }

        return (
            <>
                <Row
                    wrap={false}
                    style={{ opacity: isOutOfRange ? 0.4 : undefined }}
                >
                    <Col flex="auto" className="tree-item-title">
                        {treeItem.title}
                    </Col>
                    {actions}
                </Row>
                {showLegend && (
                    <Legend checkable={checkable} nodeData={treeItem} />
                )}
            </>
        );
    }
);

LayerTreeItemTitle.displayName = "LayerTreeItemTitle";
