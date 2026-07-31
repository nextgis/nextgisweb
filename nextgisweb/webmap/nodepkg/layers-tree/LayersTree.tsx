import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Key } from "react";

import { Tree } from "@nextgisweb/gui/antd";
import type { TreeProps } from "@nextgisweb/gui/antd";
import { EditIcon } from "@nextgisweb/gui/icon";
import { findNode } from "@nextgisweb/gui/util/tree";

import type { TreeStore } from "../store";
import type {
  TreeItemStore,
  TreeLayerStore,
} from "../store/tree-store/TreeItemStore";
import type { SetItemVisibilityOptions } from "../store/tree-store/treeStoreUtil";

import { LayerTreeItemTitle } from "./LayerTreeItemTitle";
import type { LayerTreeItemTitleProps } from "./LayerTreeItemTitle";
import { useDrag } from "./hook/useDrag";

import "./LayersTree.less";

type TreeNodeData = NonNullable<TreeProps["treeData"]>[0];

export type TreeWebmapItem = Omit<TreeNodeData, "icon"> & {
  key: number;
  children?: TreeWebmapItem[];
  treeItem: TreeItemStore;
};

interface LayersTreeProps {
  store: TreeStore;
  showLine?: boolean;
  checkable?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  showLegend?: boolean;
  expandable?: boolean;
  showDropdown?: boolean;
  onFilterItems?: (layersItems: TreeWebmapItem[]) => TreeWebmapItem[];
  onSelect?: (keys: number[]) => void;
  onReady?: () => void;
}

const LegendIcon = observer(({ treeItem }: { treeItem: TreeLayerStore }) => {
  const { legendInfo, opacity } = treeItem;
  if (legendInfo) {
    if (
      legendInfo &&
      legendInfo.visible &&
      legendInfo.single &&
      legendInfo.symbols
    ) {
      return (
        <img
          width={20}
          height={20}
          src={"data:image/png;base64," + legendInfo.symbols[0].icon.data}
          style={{ opacity: opacity ?? undefined }}
        />
      );
    }
  }
});

LegendIcon.displayName = "LegendIcon";

const ItemIcon = observer(({ treeItem }: { treeItem: TreeLayerStore }) => {
  if (treeItem.editable === true) {
    return <EditIcon />;
  } else {
    return <LegendIcon treeItem={treeItem} />;
  }
});

ItemIcon.displayName = "ItemIcon";

export const LayersTree = observer(
  ({
    store,
    showLine = true,
    draggable = true,
    checkable = true,
    expandable = true,
    selectable = true,
    showLegend = true,
    showDropdown = true,
    onFilterItems,
    onSelect: onSelectProp,
    onReady,
  }: LayersTreeProps) => {
    const [selectedKeys, setSelectedKeys] = useState<number[]>([]);

    const {
      expanded,
      childrenIds,
      deepTreeStamp,
      visibleItemIds,
      treeStructureStamp,
      layersWithoutLegendInfo,
    } = store;

    const { onDrop, allowDrop } = useDrag({ store });

    const onSelect = useCallback(
      (selectedKeysValue: Key[]) => {
        const val = selectedKeysValue.map(Number);
        setSelectedKeys(val);
        if (onSelectProp) onSelectProp(val);
      },
      [onSelectProp]
    );

    const handleWebMapItem = useCallback(
      (treeItem: TreeItemStore): TreeWebmapItem => {
        const { id, title, parentId } = treeItem;

        let inExclusiveGroup = false;

        if (store.hasExclusiveGroup && parentId !== null) {
          const parentItem = store.getItemById(parentId);
          inExclusiveGroup =
            !!parentItem && parentItem.isGroup() && parentItem.exclusive;
        }

        const item: TreeWebmapItem = {
          key: id,
          title,
          treeItem: treeItem,
          className: inExclusiveGroup ? "exclusive-child" : undefined,
        };
        const titleProps: LayerTreeItemTitleProps = {
          treeItem,
          checkable,
          showLegend: false,
          showDropdown,
          onSelect,
        };

        if (treeItem.isLayer()) {
          item.isLeaf = true;

          item.title = (
            <LayerTreeItemTitle
              {...titleProps}
              icon={<ItemIcon treeItem={treeItem} />}
              showLegend={showLegend}
            />
          );
        }

        if (treeItem.isGroup()) {
          item.title = <LayerTreeItemTitle {...titleProps} />;

          const children: TreeWebmapItem[] = [];
          [...treeItem.childrenIds].reverse().forEach((cid) => {
            const it = store.getItemById(cid);
            if (it) {
              children.push(handleWebMapItem(it));
            }
          });
          item.children = children;
        }
        return item;
      },
      [checkable, store, showLegend, showDropdown, onSelect]
    );

    const preparedWebMapItems = useMemo(() => {
      void treeStructureStamp;
      void deepTreeStamp;
      return store
        .getChildren({ childrenIds: [...childrenIds].reverse() })
        .map(handleWebMapItem);
    }, [
      store,
      childrenIds,
      deepTreeStamp,
      treeStructureStamp,
      handleWebMapItem,
    ]);

    const treeItems = useMemo(() => {
      if (onFilterItems) {
        return onFilterItems(preparedWebMapItems);
      }
      return preparedWebMapItems;
    }, [onFilterItems, preparedWebMapItems]);

    const hasGroups = useMemo(() => {
      void treeStructureStamp;
      return store.some({ type: "group" });
    }, [store, treeStructureStamp]);

    useEffect(() => {
      if (onReady) {
        onReady();
      }
    }, [onReady]);

    useEffect(() => {
      store.updateResourceLegendSymbols(
        layersWithoutLegendInfo.map((layer) => layer.styleId)
      );
    }, [store, layersWithoutLegendInfo]);

    const onExpand = (expandedKeysValue: Key[]) => {
      if (!expandable) return;
      store.setExpanded(expandedKeysValue.map(Number));
    };

    const onCheck: TreeProps<TreeWebmapItem>["onCheck"] = (_, event) => {
      const item = event.node.treeItem;
      let cascade: SetItemVisibilityOptions["cascade"];

      if (event.nativeEvent.ctrlKey) {
        if (item.isGroup()) cascade = "descendants";
        if (!event.checked && item.isLayer()) cascade = "ancestors";
      }

      store.setItemVisibility(item.id, event.checked, { cascade });
    };

    const checkedKeys = useMemo(() => {
      const ch = visibleItemIds.filter((id) =>
        findNode(treeItems, (node) => node.key === id)
      );
      return ch;
    }, [visibleItemIds, treeItems]);

    const shouldShowLine = showLine && hasGroups;

    return (
      <Tree
        className={"ngw-webmap-layers-tree" + (!shouldShowLine ? " flat" : "")}
        treeData={treeItems}
        virtual={false}
        motion={false}
        checkable={checkable}
        checkStrictly
        selectable={selectable}
        showIcon={false}
        showLine={shouldShowLine}
        onExpand={onExpand}
        expandedKeys={expanded}
        autoExpandParent={false}
        defaultExpandParent={false}
        onCheck={onCheck}
        checkedKeys={checkedKeys}
        onSelect={onSelect}
        selectedKeys={selectedKeys}
        allowDrop={allowDrop}
        draggable={draggable && !store.drawOrderEnabled && { icon: false }}
        onDrop={onDrop}
        blockNode
      />
    );
  }
);

LayersTree.displayName = "LayersTree";
