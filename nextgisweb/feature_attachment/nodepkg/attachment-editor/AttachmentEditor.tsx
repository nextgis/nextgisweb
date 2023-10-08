import { observer } from "mobx-react-lite";
import { useCallback, useMemo, useState } from "react";

import { useFileUploader } from "@nextgisweb/file-upload";
import { FileUploaderButton } from "@nextgisweb/file-upload/file-uploader";
import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { Button, Image, Input, Table, Upload } from "@nextgisweb/gui/antd";
import { formatSize } from "@nextgisweb/gui/util";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import AttachmentEditorStore from "./AttachmentEditorStore";
import { FileReaderImage } from "./component/FileReaderImage";

import DeleteIcon from "@nextgisweb/icon/material/clear";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";
import type { UploaderMeta } from "@nextgisweb/file-upload/file-uploader/type";
import type { DataSource } from "./type";

import "./AttachmentEditor.less";

function isFileImage(file: File) {
    return file && file["type"].split("/")[0] === "image";
}

const AttachmentEditor = observer(
    ({
        store,
    }: EditorWidgetProps<DataSource[] | null, AttachmentEditorStore>) => {
        const multiple = true;

        const [store_] = useState<AttachmentEditorStore>(() => {
            if (store) {
                return store;
            }
            return new AttachmentEditorStore({});
        });

        const dataSource = useMemo<DataSource[]>(() => {
            if (Array.isArray(store_.value)) {
                return store_.value;
            }
            return [];
        }, [store_.value]);

        const onChange = useCallback(
            (meta_?: UploaderMeta) => {
                if (!meta_) {
                    return;
                }
                const metaList = Array.isArray(meta_) ? meta_ : [meta_];
                store_.append(metaList);
            },
            [store_]
        );

        const { props } = useFileUploader({
            openFileDialogOnClick: false,
            onChange,
            multiple,
        });

        const updateField = useCallback(
            (field: string, row: DataSource, value: string) => {
                store_.updateItem(row, field, value);
            },
            [store_]
        );

        const handleDelete = useCallback(
            (row: object) => {
                store_.deleteItem(row as DataSource);
            },
            [store_]
        );

        const editableField = useCallback(
            (field: string) =>
                function EditableField(text: string, row: object) {
                    const r = row as DataSource;
                    return (
                        <Input
                            value={text}
                            onChange={(e) => {
                                updateField(field, r, e.target.value);
                            }}
                        />
                    );
                },
            [updateField]
        );

        const actions = useMemo(
            () => [
                <FileUploaderButton
                    key="file-uploader-button"
                    multiple={multiple}
                    onChange={onChange}
                />,
            ],
            [multiple, onChange]
        );

        return (
            <div className="ngw-feature-attachment-editor">
                <ActionToolbar actions={actions} actionProps={{}} />
                <Upload {...props}>
                    <Table
                        rowKey={(record) => {
                            const r = record as DataSource;
                            return "file_upload" in r ? r.file_upload.id : r.id;
                        }}
                        dataSource={dataSource}
                        columns={[
                            {
                                key: "preview",
                                className: "preview",
                                render: (_, row) => {
                                    const r = row as DataSource;
                                    if ("is_image" in r && r.is_image) {
                                        const url = routeURL(
                                            "feature_attachment.image",
                                            {
                                                id: store_.resourceId,
                                                fid: store_.featureId,
                                                aid: r.id,
                                            }
                                        );
                                        return (
                                            <Image
                                                width={80}
                                                src={`${url}?size=80x80`}
                                                preview={{ src: url }}
                                            />
                                        );
                                    } else if (
                                        "_file" in r &&
                                        r._file instanceof File &&
                                        isFileImage(r._file)
                                    ) {
                                        return (
                                            <FileReaderImage file={r._file} />
                                        );
                                    }
                                    return "";
                                },
                            },
                            {
                                dataIndex: "name",
                                className: "name",
                                title: gettext("File name"),
                                render: editableField("name"),
                            },
                            {
                                dataIndex: "size",
                                className: "size",
                                title: gettext("Size"),
                                render: (text: number) => formatSize(text),
                            },
                            {
                                dataIndex: "description",
                                className: "description",
                                title: gettext("Description"),
                                render: editableField("description"),
                            },
                            {
                                key: "actions",
                                title: "",
                                render: (_, record) => (
                                    <Button
                                        onClick={() => handleDelete(record)}
                                        type="text"
                                        shape="circle"
                                        icon={<DeleteIcon />}
                                    />
                                ),
                            },
                        ]}
                        parentHeight
                        size="small"
                    />
                </Upload>
            </div>
        );
    }
);

export default AttachmentEditor;
