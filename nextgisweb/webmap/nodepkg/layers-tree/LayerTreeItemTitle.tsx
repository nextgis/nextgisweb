import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { useState } from "react";

import { Col, Row } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { TreeItemStore } from "../store/tree-store/TreeItemStore";

import { DropdownActions } from "./DropdownActions";
import { Legend } from "./Legend";
import { LegendAction } from "./LegendAction";

import "./LayersTree.less";

const msgOutOfScaleRange = gettext(
    "This layer is not visible at the current map scale. Zoom to make the layer visible."
);

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
        let isOutOfScaleRange = false;
        if (shouldActions) {
            let legendAction;
            if (treeItem.isLayer()) {
                const treeLayer = treeItem;

                isOutOfScaleRange = treeItem.isOutOfScaleRange;
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
                <Row wrap={false}>
                    <Col
                        className={classNames("tree-item-title", {
                            "out-of-scale-range": isOutOfScaleRange,
                        })}
                        flex="auto"
                        title={
                            isOutOfScaleRange ? msgOutOfScaleRange : undefined
                        }
                    >
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
