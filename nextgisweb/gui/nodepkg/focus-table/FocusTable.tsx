import { observer } from "mobx-react-lite";
import { useCallback, useState } from "react";

import { Button, Col, Row } from "@nextgisweb/gui/antd";
import type { FormOnChangeOptions } from "@nextgisweb/gui/fields-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ActionToolbar } from "../action-toolbar";

import { FocusTableStore } from "./FocusTableStore";
import type { FocusTableStoreProps } from "./FocusTableStore";
import { FocusView } from "./component/FocusView";
import type { FocusProps } from "./component/FocusView";
import { TableView } from "./component/TableView";
import type { TableProps } from "./component/TableView";
import type { TreeItem, TreeItemData } from "./type";

import CloseIcon from "@nextgisweb/icon/material/close";
import DeleteIcon from "@nextgisweb/icon/material/delete";

const msgDeleteTitle = gettext("Delete");
const msgCloseTitle = gettext("Close");

export interface FocusTableProps<V extends TreeItemData = TreeItemData>
    extends FocusTableStoreProps<V> {
    store?: FocusTableStore<V>;
    table?: TableProps;
    focus?: FocusProps<V>;
}

export const FocusTable = observer(
    <V extends TreeItemData = TreeItemData>({
        store: storeProp,
        table,
        focus,
        ...props
    }: FocusTableProps<V>) => {
        const [store] = useState(() => storeProp || new FocusTableStore(props));
        const {
            size,
            items,
            focused,
            titleField,
            canDeleteItem,
            getItemFields,
            deleteFocused,
            deleteItem,
            setFocused,
            setItems,
        } = store;

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
            [items, setItems]
        );

        return (
            <Row>
                <Col span={focused ? 8 : 24}>
                    <TableView
                        style={{ width: "100%" }}
                        items={items}
                        setItems={setItems}
                        selected={focused ? [focused] : []}
                        titleField={titleField}
                        getItemFields={(e) => {
                            if (getItemFields) {
                                const fields = getItemFields(e);
                                if (
                                    typeof canDeleteItem === "function"
                                        ? canDeleteItem(e.item)
                                        : canDeleteItem
                                ) {
                                    fields.push({
                                        name: "#delete-action",
                                        render: (
                                            <Button
                                                type="text"
                                                icon={<DeleteIcon />}
                                                danger
                                                onClick={() => {
                                                    deleteItem(e.item.index);
                                                }}
                                            ></Button>
                                        ),
                                    });
                                }
                                return fields;
                            }
                            return [];
                        }}
                        setSelected={(selectedItems) => {
                            const firstSelectedItem = selectedItems[0];
                            setFocused(firstSelectedItem);
                        }}
                        {...table}
                    ></TableView>
                </Col>
                {focused && items[focused] && (
                    <Col span={16}>
                        <ActionToolbar
                            size={size}
                            actions={[
                                {
                                    onClick: () => setFocused(null),
                                    icon: <CloseIcon />,
                                    title: msgCloseTitle,
                                },
                                ...[
                                    (typeof canDeleteItem === "function"
                                        ? canDeleteItem(items[focused])
                                        : canDeleteItem) && {
                                        onClick: deleteFocused,
                                        icon: <DeleteIcon />,
                                        title: msgDeleteTitle,
                                        danger: true,
                                        disabled: !focused,
                                    },
                                ],
                            ]}
                        />
                        <FocusView
                            style={{ width: "100%" }}
                            key={focused}
                            item={items[focused]}
                            getItemFields={getItemFields}
                            onChange={onChange}
                            initialValues={items[focused].data}
                            {...focus}
                        />
                    </Col>
                )}
            </Row>
        );
    }
);
