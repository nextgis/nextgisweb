import { observer } from "mobx-react-lite";
import { useCallback } from "react";

import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { Button, Input, Modal, Upload } from "@nextgisweb/gui/antd";
import type { InputProps } from "@nextgisweb/gui/antd";
import { EdiTable } from "@nextgisweb/gui/edi-table";
import type {
    RecordItem,
    RecordOption,
} from "@nextgisweb/gui/edi-table/store/RecordItem";
import type {
    ComponentProps,
    EdiTableColumn,
} from "@nextgisweb/gui/edi-table/type";
import { ClearIcon, ExportIcon, ImportIcon } from "@nextgisweb/gui/icon";
import { parseCsv } from "@nextgisweb/gui/util/parseCsv";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    EditorWidgetComponent,
    EditorWidgetProps,
} from "@nextgisweb/resource/type";

import type { EditorStore } from "./EditorStore";
import {
    dataToRecords,
    exportToCsv,
    recordsToLookup,
    updateItems,
} from "./util";

import "./EditorWidget.less";

const msgTypeToAdd = gettext("Type here to add a new item...");
const msgExport = gettext("Export");
const msgImport = gettext("Import");
const msgClear = gettext("Clear");

// prettier-ignore
const msgConfirm = gettext("All existing records will be deleted after import. Are you sure you want to proceed?");

const InputKey = observer(
    ({ row, placeholder }: ComponentProps<RecordItem>) => {
        return (
            <Input
                value={row.key}
                onChange={(e) => {
                    const props: Partial<RecordOption> = {
                        key: e.target.value,
                    };
                    if (row.value === undefined) {
                        props.value = "";
                    }
                    row.update(props);
                }}
                variant="borderless"
                placeholder={placeholder ? msgTypeToAdd : undefined}
            />
        );
    }
);

InputKey.displayName = "InputKey";

const InputValue = observer(({ row }: ComponentProps<RecordItem>) => {
    if (row.type === "string") {
        return (
            <Input
                value={row.value as InputProps["value"]}
                onChange={(e) => {
                    row.update({ value: e.target.value });
                }}
                variant="borderless"
            />
        );
    }

    return <></>;
});

InputValue.displayName = "InputValue";

const columns: EdiTableColumn<RecordItem>[] = [
    {
        key: "key",
        title: gettext("Key"),
        width: "50%",
        component: InputKey,
    },
    {
        key: "value",
        title: gettext("Value"),
        width: "50%",
        component: InputValue,
    },
];

export const EditorWidget: EditorWidgetComponent<
    EditorWidgetProps<EditorStore>
> = observer(({ store }) => {
    const exportLookup = useCallback(() => {
        exportToCsv([{ key: "Key", value: "Value" }, ...store.items]);
    }, [store.items]);

    const [modal, contextHolder] = Modal.useModal();

    const handleFileChange = async (file: File) => {
        if (file) {
            const json = await parseCsv<[key: string, value: string]>(file);
            const items = updateItems(store.items, dataToRecords(json.data));
            store.load({ items: recordsToLookup(items) });
            store.setDirty(true);
        }
    };

    return (
        <div className="ngw-lookup-table-editor">
            {contextHolder}
            <ActionToolbar
                pad
                borderBlockEnd
                actions={[
                    () => (
                        <Upload
                            beforeUpload={async (e) => {
                                let confirmed = true;
                                if (store.items.length) {
                                    confirmed = await modal.confirm({
                                        content: msgConfirm,
                                    });
                                }
                                if (confirmed) {
                                    store.clear();
                                    handleFileChange(e);
                                }
                                // Prevent antd uploader request
                                return false;
                            }}
                            showUploadList={false}
                        >
                            <Button icon={<ImportIcon />}>{msgImport}</Button>
                        </Upload>
                    ),
                    {
                        icon: <ExportIcon />,
                        title: msgExport,
                        onClick: exportLookup,
                    },
                ]}
                rightActions={[
                    {
                        title: msgClear,
                        icon: <ClearIcon />,
                        danger: true,
                        disabled: !store.items.length,
                        onClick: store.clear,
                    },
                ]}
            />
            <EdiTable
                store={store}
                columns={columns}
                rowKey="id"
                parentHeight
            />
        </div>
    );
});

EditorWidget.title = gettext("Lookup table");
EditorWidget.order = 100;
EditorWidget.displayName = "LookupTableEditorWidget";
