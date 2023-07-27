import { observer } from "mobx-react-lite";
import { useCallback, useMemo } from "react";

import { useFileUploader } from "@nextgisweb/file-upload";
import { FileUploaderButton } from "@nextgisweb/file-upload/file-uploader";
import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { Image, Input, Table, Upload } from "@nextgisweb/gui/antd";
import { SvgIconLink } from "@nextgisweb/gui/svg-icon";
import { formatSize } from "@nextgisweb/gui/util";
import { routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n";

import { FileReaderImage } from "./component/FileReaderImage";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";
import type { UploaderMeta } from "@nextgisweb/file-upload/file-uploader/type";
import type AttachmentEditorStore from "./AttachmentEditorStore";
import type { DataSource } from "./type";

import "./AttachmentEditor.less";

function isFileImage(file: File) {
    return file && file["type"].split("/")[0] === "image";
}

const AttachmentEditor = observer(
    ({ store }: EditorWidgetProps<DataSource[], AttachmentEditorStore>) => {
        const multiple = true;

        const onChange = useCallback(
            (meta_: UploaderMeta) => {
                if (!meta_) {
                    return;
                }
                const metaList = Array.isArray(meta_) ? meta_ : [meta_];
                store.append(metaList);
            },
            [store]
        );

        const { props } = useFileUploader({
            openFileDialogOnClick: false,
            onChange,
            multiple,
        });

        const updateField = useCallback(
            (field, row, value) => {
                store.updateItem(row, field, value);
            },
            [store]
        );

        const handleDelete = useCallback(
            (row) => {
                store.deleteItem(row);
            },
            [store]
        );

        const editableField = useCallback(
            (field) =>
                function EditableField(text, row) {
                    return (
                        <Input
                            value={text}
                            onChange={(e) => {
                                updateField(field, row, e.target.value);
                            }}
                        />
                    );
                },
            [updateField]
        );

        const columns = useMemo(
            () => [
                {
                    title: i18n.gettext("Preview"),
                    key: "preview",
                    width: "100px",
                    render: (_, row: DataSource) => {
                        if ("is_image" in row && row.is_image) {
                            const url = routeURL("feature_attachment.image", {
                                id: store.resourceId,
                                fid: store.featureId,
                                aid: row.id,
                            });
                            return (
                                <Image
                                    width={80}
                                    src={`${url}?size=80x80`}
                                    preview={{ src: url }}
                                />
                            );
                        } else if (
                            "_file" in row &&
                            row._file instanceof File &&
                            isFileImage(row._file)
                        ) {
                            return <FileReaderImage file={row._file} />;
                        }
                        return "";
                    },
                },
                {
                    title: i18n.gettext("File name"),
                    dataIndex: "name",
                    key: "name",
                    render: editableField("name"),
                },
                {
                    title: i18n.gettext("Size"),
                    dataIndex: "size",
                    key: "size",
                    render: (text) => formatSize(text),
                },
                {
                    title: i18n.gettext("MIME type"),
                    dataIndex: "mime_type",
                    key: "mime_type",
                },
                {
                    title: i18n.gettext("Description"),
                    dataIndex: "description",
                    key: "size",
                    render: editableField("description"),
                },
                {
                    title: "",
                    dataIndex: "actions",
                    render: (_, record) => (
                        <SvgIconLink
                            onClick={() => handleDelete(record)}
                            iconProps={{
                                style: { height: "24px", width: "24px" },
                            }}
                            icon="material-delete_forever"
                            fill="currentColor"
                        ></SvgIconLink>
                    ),
                },
            ],
            [editableField, handleDelete, store.featureId, store.resourceId]
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
                        rowKey={(record: DataSource) =>
                            "file_upload" in record
                                ? record.file_upload.id
                                : record.id
                        }
                        dataSource={store.value}
                        columns={columns}
                        parentHeight
                        size="small"
                    />
                </Upload>
            </div>
        );
    }
);

export default AttachmentEditor;
