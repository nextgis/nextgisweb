import { observer } from "mobx-react-lite";
import { useCallback, useRef, useState } from "react";
import type { TreeItemIndex } from "react-complex-tree";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { Col, Row } from "@nextgisweb/gui/antd";
import type { SizeType } from "@nextgisweb/gui/antd";
import type {
    FormField,
    FormOnChangeOptions,
} from "@nextgisweb/gui/fields-form";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { showResourcePicker } from "../component/resource-picker";
import type { ResourcePickerStoreOptions } from "../component/resource-picker/type";
import type { ResourceItem } from "../type";

import { ResourceDetail } from "./component/ResourceDetail";
import { ResourceTree } from "./component/ResourceTree";
import type { TreeItem, TreeItems } from "./type";

import AddLayerIcon from "@nextgisweb/icon/mdi/file-document-plus-outline";
import AddGroupIcon from "@nextgisweb/icon/mdi/folder-plus-outline";

const msgAddLayerTitle = gettext("Add layer");
const msgAddGroupTitle = gettext("Add group");

const msgNewFolder = gettext("New group");

const ROOT_INDEX = "root";

interface ResourceTreeDetailProps {
    pickerOptions?: Partial<ResourcePickerStoreOptions>;
    disableGroups?: boolean;
    getItemForm?: (options: { item: TreeItem }) => FormField[];
    size?: SizeType;
}

const findNearestParent = (index: string, items: TreeItems) => {
    for (const key in items) {
        const item = items[key];
        if (item.children && item.children.includes(index)) {
            return item;
        }
    }
    return items[ROOT_INDEX];
};

export const ResourceTreeDetail = observer(
    ({
        pickerOptions,
        disableGroups,
        getItemForm,
        size,
    }: ResourceTreeDetailProps) => {
        const { makeSignal } = useAbortController();

        const [selected, setSelected] = useState<TreeItemIndex[]>([]);
        const [focused, setFocused] = useState<TreeItemIndex>();
        const [items, setItems] = useState<TreeItems>(() => {
            return {
                [ROOT_INDEX]: {
                    index: ROOT_INDEX,
                    isFolder: true,
                    children: [],
                    data: { title: "Root" },
                },
            };
        });

        const ID = useRef(1);

        const addTreeItem = useCallback(
            (item: Omit<TreeItem, "index">) => {
                const newId = String(ID.current++);
                const index = `tree-item-${newId}`;
                setItems((prev) => {
                    const newItems = JSON.parse(JSON.stringify(prev));
                    let parentItem: TreeItem = newItems[ROOT_INDEX];
                    if (focused) {
                        const parent = newItems[focused];
                        if (parent) {
                            if (!parent.isFolder) {
                                parentItem = findNearestParent(index, items);
                            } else {
                                parentItem = parent;
                            }
                        }
                    }
                    if (parentItem) {
                        parentItem.children = parentItem.children || [];
                        parentItem.children.push(index);
                    }
                    return {
                        ...newItems,
                        [index]: { index, ...item },
                    };
                });
                // setFocused(index);
            },
            [focused, items]
        );

        const addGroupItem = useCallback(() => {
            addTreeItem({
                isFolder: true,
                children: [],
                canMove: true,
                data: {
                    title: `${msgNewFolder} ${ID.current}`,
                },
            });
        }, [addTreeItem]);

        const addResourceItem = useCallback(
            async (resourceId: number | number[]) => {
                const resourceIds = Array.isArray(resourceId)
                    ? resourceId
                    : [resourceId];
                for (const id of resourceIds) {
                    const res = await route("resource.item", {
                        id,
                    }).get<ResourceItem>({
                        cache: true,
                        signal: makeSignal(),
                    });
                    if (res) {
                        addTreeItem({
                            isFolder: false,
                            canMove: true,
                            data: {
                                title: res.resource.display_name,
                                resourceItem: res,
                            },
                        });
                    }
                }
            },
            [addTreeItem, makeSignal]
        );

        const onChange = useCallback(
            (item: TreeItem, options: FormOnChangeOptions) => {
                const index = item.index;
                const treeItems = JSON.parse(
                    JSON.stringify(items)
                ) as TreeItems;
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

        return (
            <>
                <ActionToolbar
                    size={size}
                    actions={[
                        {
                            onClick: () => {
                                showResourcePicker({
                                    pickerOptions: {
                                        ...pickerOptions,
                                        saveLastParentIdGlobal: true,
                                    },
                                    onSelect: (v) => {
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
                    ]}
                ></ActionToolbar>
                <Row>
                    <Col span={8}>
                        <ResourceTree
                            {...{
                                items,
                                setItems,
                                selected,
                                setSelected,
                                focused,
                                setFocused,
                            }}
                        ></ResourceTree>
                    </Col>
                    {focused && items[focused] && (
                        <Col span={16}>
                            <ResourceDetail
                                key={focused}
                                {...{
                                    item: items[focused],
                                    getItemForm,
                                    onChange,
                                    initialValues: {
                                        title: items[focused].data.title,
                                    },
                                }}
                            />
                        </Col>
                    )}
                </Row>
            </>
        );
    }
);
