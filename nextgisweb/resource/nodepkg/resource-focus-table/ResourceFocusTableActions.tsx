import { observer } from "mobx-react-lite";
import { useCallback } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import type { TreeItem, TreeItemData } from "@nextgisweb/gui/focus-table";
import type { FocusTableStore } from "@nextgisweb/gui/focus-table/FocusTableStore";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { CompositeRead } from "@nextgisweb/resource/type/api";

import { showResourcePicker } from "../component/resource-picker";
import type { ResourcePickerStoreOptions } from "../component/resource-picker/type";

import AddLayerIcon from "@nextgisweb/icon/mdi/file-document-plus-outline";
import AddGroupIcon from "@nextgisweb/icon/mdi/folder-plus-outline";

const msgAddLayerTitle = gettext("Add layer");
const msgAddGroupTitle = gettext("Add group");

interface ResourceFocusTableProps<V extends TreeItemData = TreeItemData> {
    store: FocusTableStore<V>;
    pickerOptions?: Partial<ResourcePickerStoreOptions>;
    onResourceAdd?: (item: CompositeRead) => V;
}

export const ResourceFocusTableActions = observer(
    <V extends TreeItemData = TreeItemData>({
        store,
        pickerOptions,
        onResourceAdd,
    }: ResourceFocusTableProps<V>) => {
        const { makeSignal } = useAbortController();

        const {
            size,

            titleField,
            disableGroups,

            addTreeItems,
            addGroupItem,
        } = store;

        const addResourceItem = useCallback(
            async (
                resource: number | number[] | CompositeRead | CompositeRead[]
            ) => {
                const resources = Array.isArray(resource)
                    ? resource
                    : [resource];
                const treeItems: Omit<TreeItem, "index">[] = [];
                for (const item of resources) {
                    let res: CompositeRead | undefined = undefined;
                    if (typeof item === "number") {
                        res = await route("resource.item", {
                            id: item,
                        }).get({
                            cache: true,
                            signal: makeSignal(),
                        });
                    } else {
                        res = item;
                    }
                    if (res) {
                        const data: TreeItemData = {
                            [String(titleField)]: res.resource.display_name,
                        };
                        if (onResourceAdd) {
                            Object.assign(data, onResourceAdd(res));
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
            [addTreeItems, makeSignal, onResourceAdd, titleField]
        );

        return (
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
                ]}
            />
        );
    }
);
