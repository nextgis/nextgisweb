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
import i18n from "@nextgisweb/pyramid/i18n!feature_attachment";

import "./AttachmentEditor.css";

const extension = "attachment";

function isFileImage(file) {
    return file && file["type"].split("/")[0] === "image";
}

function FileReaderImage({ file }) {
    const [src, setSrc] = useState();
    const fr = new FileReader();
    fr.onload = function () {
        setSrc(fr.result);
    };
    fr.readAsDataURL(file);
    return (
        <Image
            width={80}
            src={src}
            preview={{
                src,
            }}
        />
    );
}

FileReaderImage.propTypes = {
    file: PropTypes.object,
};

export const AttachmentEditor = observer(({ store }) => {
    const multiple = true;

    const dataSource = useMemo(() => {
        const attachment = store.extensions[extension];
        return attachment || [];
    }, [store.extensions]);

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

            const tableHeaderHeight = wrapperElement.current
                .querySelector(".ant-table-header")
                .getBoundingClientRect().height;

            setScrollY(parentHeight - toolbarHeight - tableHeaderHeight);
        };

        const resizeObserver = new ResizeObserver(updateHeigh);
        resizeObserver.observe(wrapperElement.current.parentNode);
        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    const onChange = (metaList) => {
        if (metaList && metaList.length) {
            const newExtensions = [
                ...dataSource,
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
            store.setExtension(extension, newExtensions);
        }
    };

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
                store.setExtension(extension, updatedAttachments);
            }
        },
        [dataSource, store, findAttachmentIndex]
    );

    const handleDelete = useCallback(
        (row) => {
            const newAttachments = [...dataSource];
            const index = findAttachmentIndex(row);
            if (index !== -1) {
                newAttachments.splice(index, 1);
                store.setExtension(extension, newAttachments);
            }
        },
        [findAttachmentIndex, store, dataSource]
    );

    const editableField = useCallback(
        (field) =>
            function EditableField(text, row) {
                return (
                    <Input
                        value={text}
                        onChange={(e) =>
                            updateField(field, row, e.target.value)
                        }
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
                            id: store.resourceId,
                            fid: store.featureId,
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
                // align: "center",
                // width: "30px",
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

    const actions = [
        () => <FileUploaderButton multiple={multiple} onChange={onChange} />,
    ];

    return (
        <div ref={wrapperElement}>
            <ActionToolbar
                ref={toolbarElement}
                style={{ padding: "10px" }}
                actions={[...actions]}
                actionProps={{}}
            ></ActionToolbar>
            <Upload {...props} className="drag-to-table-uploader">
                <Table
                    rowKey={(record) =>
                        record.file_upload ? record.file_upload.id : record.id
                    }
                    dataSource={dataSource}
                    columns={columns}
                    pagination={false}
                    scroll={{ y: scrollY }}
                    sticky
                ></Table>
            </Upload>
        </div>
    );
});

AttachmentEditor.propTypes = {
    store: PropTypes.object,
};
