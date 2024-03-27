import { useCallback, useEffect, useRef, useState } from "react";
import type { TreeItemIndex } from "react-complex-tree";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { Button, Col, Row } from "@nextgisweb/gui/antd";
import type { SizeType } from "@nextgisweb/gui/antd";
import type { FormOnChangeOptions } from "@nextgisweb/gui/fields-form";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { showResourcePicker } from "../component/resource-picker";
import type { ResourcePickerStoreOptions } from "../component/resource-picker/type";
import type { ResourceItem } from "../type";

import { ResourceDetail } from "./component/ResourceDetail";
import { ResourceTree } from "./component/ResourceTree";
import { ROOT_INDEX } from "./constant";
import type {
    TreeDetailFormField,
    TreeItem,
    TreeItemData,
    TreeItems,
} from "./type";
import { convertToTree, findNearestParent, flattenTree } from "./util/tree";

import CloseIcon from "@nextgisweb/icon/material/close";
import DeleteIcon from "@nextgisweb/icon/material/delete";
import AddLayerIcon from "@nextgisweb/icon/mdi/file-document-plus-outline";
import AddGroupIcon from "@nextgisweb/icon/mdi/folder-plus-outline";

import "./ResourceTreeDetail.less";

const msgAddLayerTitle = gettext("Add layer");
const msgAddGroupTitle = gettext("Add group");
const msgDeleteTitle = gettext("Delete");
const msgNewFolder = gettext("New group");

interface ResourceTreeDetailProps<V extends TreeItemData = TreeItemData> {
    initValue: V[];
    onChange?: (val: V[]) => void;
    pickerOptions?: Partial<ResourcePickerStoreOptions>;
    disableGroups?: boolean;
    titleField?: keyof V;
    getItemFields?: (options: { item: TreeItem }) => TreeDetailFormField[];
    onAddTreeItem?: (item: ResourceItem) => V;
    size?: SizeType;
}

export function ResourceTreeDetail<V extends TreeItemData = TreeItemData>({
    initValue,
    onChange: onChangeProp,
    pickerOptions,
    disableGroups,
    onAddTreeItem,
    titleField = "display_name",
    getItemFields: getItemForm,
    size,
}: ResourceTreeDetailProps<V>) {
    const { makeSignal } = useAbortController();

    const [focused, setFocused] = useState<TreeItemIndex>();
    const [items, setItems] = useState<TreeItems<V>>(() => {
        const flatTree = initValue ? flattenTree(initValue) : {};
        return {
            [ROOT_INDEX]: {
                index: ROOT_INDEX,
                isFolder: true,
                children: Object.keys(flatTree),
                data: {},
            } as TreeItem<V>,
            ...flatTree,
        };
    });

    // Ref for unique ID generation.
    const ID = useRef(1);

    const addTreeItems = useCallback(
        (newItems: Omit<TreeItem, "index">[]) => {
            setItems((prevItems) => {
                const updatedItems = { ...prevItems };
                let parentIndex: TreeItemIndex = ROOT_INDEX;

                if (focused) {
                    const parent = updatedItems[focused];
                    if (parent && !parent.isFolder) {
                        const nearestParent = findNearestParent(
                            focused,
                            updatedItems
                        ) as TreeItem<V>;
                        parentIndex = nearestParent
                            ? nearestParent.index
                            : ROOT_INDEX;
                    } else {
                        parentIndex = focused;
                    }
                }

                const parentItem = (updatedItems[parentIndex] = updatedItems[
                    parentIndex
                ] || { children: [], isFolder: true });
                parentItem.children = parentItem.children || [];

                newItems.forEach((item) => {
                    const newId = `added-tree-item-${String(ID.current++)}`;
                    updatedItems[newId] = {
                        index: newId,
                        ...item,
                    } as TreeItem<V>;
                    parentItem.children!.push(newId);
                });

                return updatedItems;
            });
        },
        [focused]
    );

    const deleteFocused = useCallback(() => {
        if (focused) {
            setItems((prevItems) => {
                const updatedItems = { ...prevItems };

                const deleteItemAndChildren = (itemId: TreeItemIndex) => {
                    const item = updatedItems[itemId];
                    if (item && item.children) {
                        item.children.forEach((childId) =>
                            deleteItemAndChildren(childId)
                        );
                    }
                    delete updatedItems[itemId];
                };

                deleteItemAndChildren(focused);

                const parent = findNearestParent(focused, updatedItems);
                if (parent && parent.children) {
                    parent.children = parent.children.filter(
                        (childId) => childId !== focused
                    );
                }

                return updatedItems;
            });

            setFocused(undefined);
        }
    }, [focused, setItems]);

    const addGroupItem = useCallback(() => {
        addTreeItems([
            {
                isFolder: true,
                children: [],
                canMove: true,
                data: {
                    [titleField]: `${msgNewFolder} ${ID.current}`,
                },
            },
        ]);
    }, [addTreeItems, titleField]);

    const addResourceItem = useCallback(
        async (resource: number | number[] | ResourceItem | ResourceItem[]) => {
            const resources = Array.isArray(resource) ? resource : [resource];
            const treeItems: Omit<TreeItem, "index">[] = [];
            for (const item of resources) {
                let res: ResourceItem | undefined = undefined;
                if (typeof item === "number") {
                    res = await route("resource.item", {
                        id: item,
                    }).get<ResourceItem>({
                        cache: true,
                        signal: makeSignal(),
                    });
                } else {
                    res = item;
                }
                if (res) {
                    const data: TreeItemData = {
                        [titleField]: res.resource.display_name,
                    };
                    if (onAddTreeItem) {
                        Object.assign(data, onAddTreeItem(res));
                    }
                    treeItems.push({
                        isFolder: false,
                        canMove: true,
                        data,
                    });
                }
            }

            addTreeItems(treeItems);
        },
        [addTreeItems, makeSignal, onAddTreeItem, titleField]
    );

    const onChange = useCallback(
        (item: TreeItem, options: FormOnChangeOptions) => {
            const index = item.index;
            const treeItems = { ...items };
            const treeItem = treeItems[index];
            if (treeItem) {
                treeItems[index].data = {
                    ...treeItem.data,
                    ...options.value,
                };
            }
            setItems(treeItems);
        },
        [items]
    );

    useEffect(() => {
        if (onChangeProp) {
            const tree = convertToTree<V>(items);
            const rootChildren = tree[0] && tree[0].children;
            if (rootChildren) {
                onChangeProp(rootChildren);
            }
        }
    }, [items, onChangeProp]);

    return (
        <>
            <ActionToolbar
                size={size}
                actions={[
                    {
                        onClick: () => {
                            showResourcePicker({
                                pickerOptions: {
                                    multiple: true,
                                    ...pickerOptions,
                                    saveLastParentIdGlobal: true,
                                },
                                onPick: (v) => {
                                    if (v) {
                                        addResourceItem(v);
                                    }
                                },
                            });
                        },
                        icon: <AddLayerIcon />,
                        title: msgAddLayerTitle,
                    },

                    ...[
                        disableGroups
                            ? undefined
                            : {
                                  onClick: addGroupItem,
                                  icon: <AddGroupIcon />,
                                  title: msgAddGroupTitle,
                              },
                    ],
                    {
                        onClick: deleteFocused,
                        icon: <DeleteIcon />,
                        title: msgDeleteTitle,
                        danger: true,
                        disabled: !focused,
                        size,
                    },
                ]}
            ></ActionToolbar>
            <Row>
                <Col span={focused ? 8 : 24}>
                    <ResourceTree
                        style={{ width: "100%" }}
                        items={items}
                        setItems={setItems}
                        selected={focused ? [focused] : []}
                        getItemFields={getItemForm}
                        setSelected={(selectedItems) => {
                            const firstSelectedItem = selectedItems[0];
                            setFocused(firstSelectedItem);
                        }}
                    ></ResourceTree>
                </Col>
                {focused && items[focused] && (
                    <Col span={16}>
                        <Button
                            type="text"
                            size="small"
                            icon={<CloseIcon />}
                            onClick={() => {
                                setFocused(undefined);
                            }}
                        />
                        <ResourceDetail
                            style={{ width: "100%" }}
                            key={focused}
                            item={items[focused]}
                            getItemFields={getItemForm}
                            onChange={onChange}
                            initialValues={items[focused].data}
                        />
                    </Col>
                )}
            </Row>
        </>
    );
}
