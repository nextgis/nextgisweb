import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import { Button, Typography } from "@nextgisweb/gui/antd";
import type { ButtonProps, GetProp, Image } from "@nextgisweb/gui/antd";
import { useThemeVariables } from "@nextgisweb/gui/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { Attachment } from "./AttachmentPreviewGroup";
import type { PanoramaStore } from "./PanoramaStore";

import ChevronLeftIcon from "@nextgisweb/icon/material/chevron_left";
import ChevronRightIcon from "@nextgisweb/icon/material/chevron_right";
import DownloadIcon from "@nextgisweb/icon/material/download";
import FullscreenIcon from "@nextgisweb/icon/material/fullscreen";
import PanoramaIcon from "@nextgisweb/icon/material/panorama_photosphere";
import PhotoIcon from "@nextgisweb/icon/material/photo";
import Rotate90DegreesCCWIcon from "@nextgisweb/icon/material/rotate_90_degrees_ccw";
import Rotate90DegreesCWIcon from "@nextgisweb/icon/material/rotate_90_degrees_cw";
import ZoomInIcon from "@nextgisweb/icon/material/zoom_in";
import ZoomOutIcon from "@nextgisweb/icon/material/zoom_out";

import "./AttachmentPreviewToolbar.less";

const { Paragraph } = Typography;

type PreviewProps = GetProp<typeof Image.PreviewGroup, "preview">;

export type ImagePreviewProp = Exclude<PreviewProps, boolean>;
export type ToolbarRenderInfoType = Parameters<
    NonNullable<ImagePreviewProp["toolbarRender"]>
>[1];

const msgTogglePanorama = gettext("Toggle panorama viewer");

function ToolbarButton(props: ButtonProps) {
    return <Button type="text" {...props} />;
}

interface AttachmentPreviewToolbarProps extends ToolbarRenderInfoType {
    panoramaStore: PanoramaStore;
    panoramaMode: boolean;
    attachmentId: number;
    attachment: Attachment;
    onDownload: () => void;
    togglePanoramaMode: () => void;
}

export const AttachmentPreviewToolbar = observer(
    ({
        onDownload,
        togglePanoramaMode,
        panoramaStore,
        panoramaMode,
        attachmentId,
        attachment,
        transform: { scale },
        actions: { onRotateRight, onRotateLeft, onZoomOut, onZoomIn, onActive },
        current,
        total,
    }: AttachmentPreviewToolbarProps) => {
        const { description, isPanorama } = attachment;
        const [expanded, setExpanded] = useState(false);
        const [panoramaZoom, setPanoramaZoom] = useState<number | undefined>(
            undefined
        );

        const toggleExpanded = () => {
            setExpanded((prev) => !prev);
        };

        const { viewers } = panoramaStore;

        const panoramaViewer = useMemo(() => {
            return viewers.get(attachmentId);
        }, [attachmentId, viewers]);

        useEffect(() => {
            if (!panoramaViewer) return;

            panoramaViewer.navbar?.hide?.();

            const onPanaramaZoomChange = () =>
                setPanoramaZoom(panoramaViewer.getZoomLevel());

            const onFullScreen = (e: any) => {
                if (e.fullscreenEnabled) {
                    panoramaViewer.navbar?.setButtons?.([
                        "zoom",
                        "fullscreen",
                        "move",
                    ]);
                    panoramaViewer.navbar?.show?.();
                } else {
                    panoramaViewer.navbar?.hide?.();
                }
            };

            panoramaViewer.addEventListener("fullscreen", onFullScreen);
            panoramaViewer.addEventListener(
                "zoom-updated",
                onPanaramaZoomChange
            );
            return () => {
                panoramaViewer.removeEventListener("fullscreen", onFullScreen);
                panoramaViewer.removeEventListener(
                    "zoom-updated",
                    onPanaramaZoomChange
                );
            };
        }, [panoramaViewer]);

        const panoramaActive = isPanorama && panoramaMode && panoramaViewer;

        const zoomInProps: ButtonProps = panoramaActive
            ? {
                  disabled: !!(panoramaZoom && panoramaZoom >= 100),
                  onClick: () => panoramaViewer.zoomIn(20),
              }
            : {
                  disabled: scale >= 50,
                  onClick: onZoomIn,
              };

        const zoomOutProps: ButtonProps = panoramaActive
            ? {
                  disabled: !!(panoramaZoom && panoramaZoom <= 0),
                  onClick: () => panoramaViewer.zoomOut(20),
              }
            : {
                  disabled: scale <= 1,
                  onClick: onZoomOut,
              };

        const panoramaModeToggleProps: ButtonProps | undefined = isPanorama
            ? {
                  icon: panoramaActive ? <PhotoIcon /> : <PanoramaIcon />,
                  title: msgTogglePanorama,
                  onClick: togglePanoramaMode,
              }
            : undefined;

        const themeVariables = useThemeVariables({
            "theme-border-radius": "borderRadius",
            "theme-color-text-light-solid": "colorTextLightSolid",
            "theme-padding-xs": "paddingXS",
        });

        return (
            <div
                className="ngw-feature-attachment-image-thumbnail-toolbar"
                style={themeVariables}
            >
                {description && (
                    <Paragraph
                        className="name-or-description"
                        ellipsis={{
                            rows: 2,
                            expandable: "collapsible",
                            expanded: expanded,
                            onExpand: toggleExpanded,
                        }}
                    >
                        {description}
                    </Paragraph>
                )}
                <div className="toolbar">
                    {total > 1 && (
                        <>
                            <ToolbarButton
                                icon={<ChevronLeftIcon />}
                                disabled={current === 0}
                                onClick={() => onActive?.(-1)}
                            />
                            <ToolbarButton
                                style={{
                                    cursor: "unset",
                                    paddingInline: "8px",
                                }}
                            >
                                {current + 1} / {total}
                            </ToolbarButton>
                            <ToolbarButton
                                icon={<ChevronRightIcon />}
                                disabled={current + 1 === total}
                                onClick={() => onActive?.(+1)}
                            />
                        </>
                    )}

                    <ToolbarButton icon={<ZoomInIcon />} {...zoomInProps} />
                    <ToolbarButton icon={<ZoomOutIcon />} {...zoomOutProps} />

                    {!panoramaActive && (
                        <>
                            <ToolbarButton
                                icon={<Rotate90DegreesCWIcon />}
                                onClick={onRotateRight}
                            />
                            <ToolbarButton
                                icon={<Rotate90DegreesCCWIcon />}
                                onClick={onRotateLeft}
                            />
                        </>
                    )}

                    {panoramaModeToggleProps && (
                        <ToolbarButton {...panoramaModeToggleProps} />
                    )}

                    {panoramaActive && (
                        <ToolbarButton
                            icon={<FullscreenIcon />}
                            onClick={() => panoramaViewer.enterFullscreen()}
                        />
                    )}

                    <ToolbarButton
                        icon={<DownloadIcon />}
                        onClick={onDownload}
                    />
                </div>
            </div>
        );
    }
);

AttachmentPreviewToolbar.displayName = "AttachmentPreviewToolbar";
