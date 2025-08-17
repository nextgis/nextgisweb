import { useMemo } from "react";

import { Table } from "@nextgisweb/gui/antd";
import type { TableProps } from "@nextgisweb/gui/antd";
import { formatSize } from "@nextgisweb/gui/util";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FeatureAttachment } from "../type";

import { AttachmentImages } from "./AttachmentImages";

import "./AttachmentTable.less";

export interface AttachmentTableProps {
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
                        <a href={href} target="_blank">
                            {name || <i>{gettext("Unnamed")}</i>}
                        </a>
                    );
                },
            },
            {
                dataIndex: "size",
                className: "size",
                title: gettext("Size"),
                render: (size: number) => formatSize(size),
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
                <div className="images">
                    <AttachmentImages
                        attachments={images}
                        resourceId={resourceId}
                        featureId={featureId}
                        isSmall={isSmall}
                    />
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
                    bordered
                />
            )}
        </div>
    );
}
