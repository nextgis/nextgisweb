import { observer } from "mobx-react-lite";
import { useState } from "react";

import type { Attachment } from "@nextgisweb/feature-attachment/attachment-editor/type";
import { Button, Typography } from "@nextgisweb/gui/antd";
import type { ButtonProps, GetProp, Image } from "@nextgisweb/gui/antd";
import { useThemeVariables } from "@nextgisweb/gui/hook";

import type { PanoramaStore } from "../viewers/panorama/PanoramaStore";
import { usePanoramaToolbarControls } from "../viewers/panorama/usePanoramaToolbarControls";

import ChevronLeftIcon from "@nextgisweb/icon/material/chevron_left";
import ChevronRightIcon from "@nextgisweb/icon/material/chevron_right";
import DownloadIcon from "@nextgisweb/icon/material/download";
import Rotate90DegreesCCWIcon from "@nextgisweb/icon/material/rotate_90_degrees_ccw";
import Rotate90DegreesCWIcon from "@nextgisweb/icon/material/rotate_90_degrees_cw";
import ZoomInIcon from "@nextgisweb/icon/material/zoom_in";
import ZoomOutIcon from "@nextgisweb/icon/material/zoom_out";

import "./AttachmentPreviewToolbar.less";

const { Paragraph } = Typography;

type PreviewProps = GetProp<typeof Image.PreviewGroup, "preview">;

export type ImagePreviewProp = Exclude<PreviewProps, boolean>;
export type ToolbarRenderInfoType = Parameters<
  NonNullable<ImagePreviewProp["actionsRender"]>
>[1];

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

    const toggleExpanded = () => {
      setExpanded((prev) => !prev);
    };

    const {
      panoramaActive,
      zoomInProps: panoramaZoomInProps,
      zoomOutProps: panoramaZoomOutProps,
      modeToggleProps: panoramaModeToggleProps,
      fullscreenProps: panoramaFullscreenProps,
    } = usePanoramaToolbarControls({
      panoramaStore,
      attachmentId,
      isPanorama,
      panoramaMode,
      togglePanoramaMode,
    });

    const zoomInProps: ButtonProps = panoramaZoomInProps ?? {
      disabled: scale >= 50,
      onClick: onZoomIn,
    };

    const zoomOutProps: ButtonProps = panoramaZoomOutProps ?? {
      disabled: scale <= 1,
      onClick: onZoomOut,
    };

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

          {panoramaFullscreenProps && (
            <ToolbarButton {...panoramaFullscreenProps} />
          )}

          <ToolbarButton icon={<DownloadIcon />} onClick={onDownload} />
        </div>
      </div>
    );
  }
);

AttachmentPreviewToolbar.displayName = "AttachmentPreviewToolbar";
