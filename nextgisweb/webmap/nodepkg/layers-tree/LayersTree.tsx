import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import { Col, Row, Tree } from "@nextgisweb/gui/antd";
import type { TreeProps } from "@nextgisweb/gui/antd";

import type WebmapStore from "../store";
import type { TreeItem } from "../type/TreeItems";
import type { WebmapPlugin } from "../type/WebmapPlugin";

import { DropdownActions } from "./DropdownActions";
import { Legend } from "./Legend";
import { LegendAction } from "./LegendAction";
import { useDrag } from "./hook/useDrag";
import {
    keyInMutuallyExclusiveGroupDeep,
    prepareWebMapItems,
    updateKeysForGroup,
    updateKeysForMutualExclusivity,
} from "./util/treeItems";

import "./LayersTree.less";

type TreeNodeData = NonNullable<TreeProps["treeData"]>[0];

export type TreeWebmapItem = TreeNodeData & {
    key: number;
    children?: TreeWebmapItem[];
    legendIcon?: React.ReactNode;
    treeItem: TreeItem;
};

interface LayersTreeProps {
    store: WebmapStore;
    onSelect?: (keys: number[]) => void;
    setLayerZIndex: (id: number, zIndex: number) => void;
    getWebmapPlugins: () => Record<string, WebmapPlugin>;
    onReady?: () => void;
    onFilterItems?: (
        store: WebmapStore,
        layersItems: TreeWebmapItem[]
    ) => TreeWebmapItem[];
    showLegend?: boolean;
    showDropdown?: boolean;
    checkable?: boolean;
    draggable?: boolean;
    selectable?: boolean;
}

export const LayersTree = observer(
    ({
        store,
        onSelect,
        setLayerZIndex,
        getWebmapPlugins,
        onReady,
        onFilterItems,
        showLegend = true,
        showDropdown = true,
        checkable = true,
        draggable = true,
        selectable = true,
    }: LayersTreeProps) => {
        const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
        const [autoExpandParent, setAutoExpandParent] = useState(true);
        const [moreClickId, setMoreClickId] = useState<number>();
        const [update, setUpdate] = useState(false);
        const webmapItems = store.webmapItems;

        const { onDrop, allowDrop } = useDrag({ store, setLayerZIndex });

        const treeItems = useMemo(() => {
            let _webmapItems = prepareWebMapItems(webmapItems);
            if (onFilterItems) {
                _webmapItems = onFilterItems(store, _webmapItems);
            }
            return _webmapItems;
        }, [webmapItems]);

        const hasGroups = useMemo(() => {
            for (const itm of webmapItems) {
                if (itm.type === "group") {
                    return true;
                }
            }
            return false;
        }, [webmapItems]);

        useEffect(() => {
            if (onReady) {
                onReady();
            }
        }, [onReady]);

        const onExpand = (expandedKeysValue: React.Key[]) => {
            store.setExpanded(expandedKeysValue.map(Number));
            setAutoExpandParent(false);
        };

        const onCheck: TreeProps<TreeWebmapItem>["onCheck"] = (
            checkedKeysValue,
            event
        ) => {
            const checkedItem = event.node;
            const checkedKeys = (
                Array.isArray(checkedKeysValue)
                    ? checkedKeysValue
                    : checkedKeysValue.checked
            ).map(Number);

            const mutuallyExclusiveParents = keyInMutuallyExclusiveGroupDeep(
                checkedItem.treeItem.key,
                treeItems.map((t) => t.treeItem)
            );

            let updatedCheckedKeys = checkedKeys;

            if (mutuallyExclusiveParents) {
                updatedCheckedKeys = updateKeysForMutualExclusivity(
                    checkedItem,
                    mutuallyExclusiveParents,
                    checkedKeys
                );
            } else if (checkedItem.treeItem.type === "group") {
                updatedCheckedKeys = updateKeysForGroup(
                    checkedItem,
                    checkedKeys,
                    store.checked
                );
            }

            store.handleCheckChanged(updatedCheckedKeys);
        };

        const _onSelect = (selectedKeysValue: React.Key[]) => {
            const val = selectedKeysValue.map(Number);
            setSelectedKeys(val);
            if (onSelect) onSelect(val);
        };

        const titleRender = (nodeData: TreeWebmapItem) => {
            const { title } = nodeData.treeItem;

            const shouldActions = showLegend || showDropdown;

            let actions;
            if (shouldActions) {
                const legendAction = showLegend && (
                    <LegendAction
                        nodeData={nodeData.treeItem}
                        onClick={() => setUpdate(!update)}
                    />
                );

                const dropdownAction = showDropdown && (
                    <DropdownActions
                        nodeData={nodeData.treeItem}
                        getWebmapPlugins={getWebmapPlugins}
                        setMoreClickId={setMoreClickId}
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
                        <Col flex="auto" className="tree-item-title">
                            {title}
                        </Col>
                        {actions}
                    </Row>
                    {showLegend && (
                        <Legend
                            checkable={checkable}
                            nodeData={nodeData.treeItem}
                            store={store}
                        />
                    )}
                </>
            );
        };

        return (
            <Tree
                className={
                    "ngw-webmap-layers-tree" + (!hasGroups ? " flat" : "")
                }
                virtual={false}
                motion={false}
                checkable={checkable}
                selectable={selectable}
                showIcon
                showLine={hasGroups}
                onExpand={onExpand}
                expandedKeys={store.expanded}
                autoExpandParent={autoExpandParent}
                onCheck={onCheck}
                checkedKeys={store.checked}
                onSelect={_onSelect}
                selectedKeys={selectedKeys}
                treeData={treeItems}
                titleRender={titleRender}
                allowDrop={allowDrop}
                draggable={draggable && { icon: false }}
                onDrop={onDrop}
                blockNode
            />
        );
    }
);
