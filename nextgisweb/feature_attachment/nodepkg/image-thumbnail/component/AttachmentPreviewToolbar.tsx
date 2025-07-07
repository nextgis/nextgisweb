import { useState } from "react";
import type { CSSProperties } from "react";

import { Space, Tooltip } from "@nextgisweb/gui/antd";
import type { GetProp, Image } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { Attachment } from "../hook/useAttachmentPreview";

import {
    DownloadOutlined,
    LeftOutlined,
    RightOutlined,
    RotateLeftOutlined,
    RotateRightOutlined,
    ZoomInOutlined,
    ZoomOutOutlined,
} from "@ant-design/icons";
import PhotosphereIcon from "@nextgisweb/icon/material/panorama_photosphere";

type PreviewProps = GetProp<typeof Image.PreviewGroup, "preview">;

export type ImagePreviewProp = Exclude<PreviewProps, boolean>;
export type ToolbarRenderInfoType = Parameters<
    NonNullable<ImagePreviewProp["toolbarRender"]>
>[1];

const msgTogglePanorama = gettext("Toggle panorama viewer");

interface AttachmentPreviewToolbarProps extends ToolbarRenderInfoType {
    panoramaMode: boolean;
    attachment: Attachment;
    onDownload: () => void;
    togglePanoramaMode: () => void;
}

export function AttachmentPreviewToolbar({
    onDownload,
    togglePanoramaMode,
    panoramaMode,
    attachment,
    transform: { scale },
    actions: { onRotateRight, onRotateLeft, onZoomOut, onZoomIn, onActive },
}: AttachmentPreviewToolbarProps) {
    const { name, description, isPanorama } = attachment;
    const [expanded, setExpanded] = useState(false);
    const maxLines = 1;

    const toggleExpanded = () => {
        setExpanded((prev) => !prev);
    };

    const descriptionText = description || name;
    const isLongText =
        descriptionText.length > 200 || descriptionText.includes("\n");

    const textStyle: CSSProperties = {
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: expanded ? "none" : maxLines,
        WebkitBoxOrient: "vertical",
        textAlign: "center" as const,
        whiteSpace: "pre-wrap",
        maxWidth: "60vw",
    };

    return (
        <Space
            direction="vertical"
            style={{
                borderRadius: "var(--border-radius-root)",
                backgroundColor: "var(--divider-color)",
                padding: "0px 24px",
                color: "var(--on-primary-text)",
                fontSize: "20px",
                fontFamily: "var(--ngw-text-font-family)",
            }}
        >
            <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={textStyle}>{descriptionText}</div>
                {isLongText && (
                    <div
                        style={{
                            cursor: "pointer",
                            textAlign: "center",
                            fontSize: "14px",
                            color: "var(--text-secondary)",
                            marginTop: 4,
                        }}
                        onClick={toggleExpanded}
                    >
                        {expanded ? gettext("Show less") : gettext("Show more")}
                    </div>
                )}
            </div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    paddingBottom: "10px",
                }}
            >
                <LeftOutlined onClick={() => onActive?.(-1)} />
                <RightOutlined onClick={() => onActive?.(1)} />
                <DownloadOutlined onClick={onDownload} />

                {isPanorama ? (
                    <Tooltip title={msgTogglePanorama}>
                        <PhotosphereIcon
                            style={{
                                cursor: "pointer",
                                color: panoramaMode
                                    ? undefined
                                    : "var(--text-secondary)",
                            }}
                            onClick={togglePanoramaMode}
                        />
                    </Tooltip>
                ) : (
                    <>
                        <RotateLeftOutlined onClick={onRotateLeft} />
                        <RotateRightOutlined onClick={onRotateRight} />
                        <ZoomOutOutlined
                            disabled={scale === 1}
                            onClick={onZoomOut}
                        />
                        <ZoomInOutlined
                            disabled={scale === 50}
                            onClick={onZoomIn}
                        />
                    </>
                )}
            </div>
        </Space>
    );
}
