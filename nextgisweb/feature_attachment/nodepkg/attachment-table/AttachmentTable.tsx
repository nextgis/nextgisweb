import { useMemo, useRef } from "react";

import { Table } from "@nextgisweb/gui/antd";
import type { TableProps } from "@nextgisweb/gui/antd";
import showModal from "@nextgisweb/gui/showModal";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import ImageThumbnail from "../image-thumbnail";
import { CarouselModal } from "../image-thumbnail/component/CarouselModal";
import type { FeatureAttachment } from "../type";
import { fileSizeToString } from "../utils";

import "./AttachmentTable.less";

interface AttachmentTableProps {
    attachments: FeatureAttachment[];
    featureId: number;
    resourceId: number;
    isSmall: boolean | undefined;
}

export function AttachmentTable({
    attachments,
    featureId,
    resourceId,
    isSmall,
}: AttachmentTableProps) {
    const previewRef = useRef<HTMLDivElement>(null);
    const size = isSmall ? 64 : 128;

    const [images, others] = useMemo(
        () => [
            attachments.filter((a) => a.is_image),
            attachments.filter((a) => !a.is_image),
        ],
        [attachments]
    );

    const tableColumns = useMemo(() => {
        const result: TableProps["columns"] = [
            {
                dataIndex: "name",
                className: "name",
                title: gettext("File name"),
                render: (name: string, attachment: FeatureAttachment) => {
                    const href = routeURL("feature_attachment.download", {
                        id: resourceId,
                        fid: featureId,
                        aid: attachment.id,
                    });

                    return (
                        <a href={href} target="_blank" rel="noreferrer">
                            {name}
                        </a>
                    );
                },
            },
            {
                dataIndex: "size",
                className: "size",
                title: gettext("Size"),
                render: (size: number) => fileSizeToString(size),
            },
        ];

        if (!isSmall) {
            result.push({
                dataIndex: "mime_type",
                className: "mime-type",
                title: gettext("MIME type"),
            });

            result.push({
                dataIndex: "description",
                className: "description",
                title: gettext("Description"),
            });
        }

        return result;
    }, [featureId, isSmall, resourceId]);

    return (
        <div className="ngw-feature-attachment-attachment-table">
            {images.length > 0 && (
                <div ref={previewRef} className="images">
                    {images.map((attachment, index) => {
                        return (
                            <ImageThumbnail
                                key={index}
                                attachment={attachment}
                                resourceId={resourceId}
                                featureId={featureId}
                                width={size}
                                height={size}
                                onClick={() => {
                                    const container = previewRef.current;
                                    if (container) {
                                        showModal(CarouselModal, {
                                            dataSource: attachments,
                                            attachment: attachment,
                                            featureId: featureId,
                                            resourceId: resourceId,
                                            getContainer: container,
                                        });
                                    }
                                }}
                            />
                        );
                    })}
                </div>
            )}
            {others.length > 0 && (
                <Table
                    rowKey={(attachment: FeatureAttachment) => attachment.id}
                    dataSource={others}
                    columns={tableColumns}
                    showHeader={!isSmall}
                    size="small"
                    tableLayout="auto"
                />
            )}
        </div>
    );
}
