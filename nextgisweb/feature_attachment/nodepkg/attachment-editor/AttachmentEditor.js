import { PropTypes } from "prop-types";

import { observer } from "mobx-react-lite";
import { useCallback, useMemo, useLayoutEffect, useRef, useState } from "react";

import { useFileUploader } from "@nextgisweb/file-upload";
import { FileUploaderButton } from "@nextgisweb/file-upload/file-uploader";
import { ActionToolbar } from "@nextgisweb/gui/action-toolbar";
import { Image, Input, Table, Upload } from "@nextgisweb/gui/antd";
import { SvgIconLink } from "@nextgisweb/gui/svg-icon";
import { formatSize } from "@nextgisweb/gui/util";
import { routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n";

import { FileReaderImage } from "./component/FileReaderImage";

import "./AttachmentEditor.css";

function isFileImage(file) {
    return file && file["type"].split("/")[0] === "image";
}

export const AttachmentEditor = observer(({ store, extension }) => {
    const multiple = true;

    const { extensions, setExtension, resourceId, featureId } = store;

    const dataSource = useMemo(() => {
        const attachment = extensions[extension];
        return attachment || [];
    }, [extensions, extension]);

    const [scrollY, setScrollY] = useState();
    const wrapperElement = useRef();
    const toolbarElement = useRef();

    useLayoutEffect(() => {
        const updateHeigh = () => {
            const parentHeight =
                wrapperElement.current.parentNode.getBoundingClientRect()
                    .height;
            const toolbarHeight =
                toolbarElement.current.getBoundingClientRect().height;

            const tableHeader =
                wrapperElement.current.querySelector(".ant-table-thead");
            if (tableHeader) {
                const tableHeaderHeight =
                    tableHeader.getBoundingClientRect().height;
                setScrollY(parentHeight - toolbarHeight - tableHeaderHeight);
            }
        };

        const resizeObserver = new ResizeObserver(updateHeigh);
        resizeObserver.observe(wrapperElement.current.parentNode);
        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    const onChange = useCallback(
        (metaList) => {
            if (metaList && metaList.length) {
                setExtension(extension, (old) => {
                    return [
                        ...(old || []),
                        ...metaList.map((meta) => {
                            const { mime_type, id, name, size, _file } = meta;
                            return {
                                _file,
                                lid: undefined,
                                name,
                                size,
                                mime_type,
                                description: "",
                                file_upload: { id, size },
                            };
                        }),
                    ];
                });
            }
        },
        [setExtension]
    );

    const { props } = useFileUploader({
        openFileDialogOnClick: false,
        onChange,
        multiple,
    });

    const findAttachmentIndex = useCallback(
        (row) => {
            const rowId = row.file_upload ? row.file_upload.id : row.id;
            return dataSource.findIndex(
                (a) =>
                    a.id === rowId ||
                    (a.file_upload && a.file_upload.id === rowId)
            );
        },
        [dataSource]
    );

    const updateField = useCallback(
        (field, row, value) => {
            const updatedAttachments = [...dataSource];
            const index = findAttachmentIndex(row);
            if (index !== -1) {
                const oldAttachment = updatedAttachments[index];
                updatedAttachments.splice(index, 1, {
                    ...oldAttachment,
                    [field]: value,
                });
                setExtension(extension, updatedAttachments);
            }
        },
        [dataSource, setExtension, findAttachmentIndex]
    );

    const handleDelete = useCallback(
        (row) => {
            const newAttachments = [...dataSource];
            const index = findAttachmentIndex(row);
            if (index !== -1) {
                newAttachments.splice(index, 1);
                setExtension(extension, newAttachments);
            }
        },
        [findAttachmentIndex, setExtension, dataSource]
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
                render: (_, row) => {
                    if (row.is_image) {
                        const url = routeURL("feature_attachment.image", {
                            id: resourceId,
                            fid: featureId,
                            aid: row.id,
                        });
                        return (
                            <Image
                                width={80}
                                src={`${url}?size=80x80`}
                                preview={{
                                    src: url,
                                }}
                            />
                        );
                    } else if (row._file && isFileImage(row._file)) {
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
        [editableField, handleDelete, featureId, resourceId]
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
        <div ref={wrapperElement}>
            <ActionToolbar
                ref={toolbarElement}
                style={{ padding: "10px" }}
                actions={actions}
                actionProps={{}}
            ></ActionToolbar>
            <Upload {...props} className="drag-to-table-uploader">
                <Table
                    rowKey={(record) =>
                        record.file_upload ? record.file_upload.id : record.id
                    }
                    dataSource={dataSource}
                    columns={columns}
                    scroll={{ y: scrollY }}
                ></Table>
            </Upload>
        </div>
    );
});

AttachmentEditor.propTypes = {
    store: PropTypes.object,
    extension: PropTypes.string,
};
