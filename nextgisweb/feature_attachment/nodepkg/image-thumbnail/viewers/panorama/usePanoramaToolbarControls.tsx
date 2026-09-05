import { useEffect, useMemo, useState } from "react";

import type { ButtonProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { PanoramaStore } from "./PanoramaStore";

import FullscreenIcon from "@nextgisweb/icon/material/fullscreen";
import PanoramaIcon from "@nextgisweb/icon/material/panorama_photosphere";
import PhotoIcon from "@nextgisweb/icon/material/photo";

const msgTogglePanorama = gettext("Toggle panorama viewer");

interface UsePanoramaToolbarControlsParams {
  panoramaStore: PanoramaStore;
  attachmentId: number;
  isPanorama: boolean;
  panoramaMode: boolean;
  togglePanoramaMode: () => void;
}

export function usePanoramaToolbarControls({
  panoramaStore,
  attachmentId,
  isPanorama,
  panoramaMode,
  togglePanoramaMode,
}: UsePanoramaToolbarControlsParams) {
  const { viewers } = panoramaStore;

  const panoramaViewer = useMemo(
    () => viewers.get(attachmentId),
    [attachmentId, viewers]
  );

  const [panoramaZoom, setPanoramaZoom] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    if (!panoramaViewer) return;

    panoramaViewer.navbar?.hide?.();

    const onPanaramaZoomChange = () =>
      setPanoramaZoom(panoramaViewer.getZoomLevel());

    const onFullScreen = (e: any) => {
      if (e.fullscreenEnabled) {
        panoramaViewer.navbar?.setButtons?.(["zoom", "fullscreen", "move"]);
        panoramaViewer.navbar?.show?.();
      } else {
        panoramaViewer.navbar?.hide?.();
      }
    };

    panoramaViewer.addEventListener("fullscreen", onFullScreen);
    panoramaViewer.addEventListener("zoom-updated", onPanaramaZoomChange);
    return () => {
      panoramaViewer.removeEventListener("fullscreen", onFullScreen);
      panoramaViewer.removeEventListener("zoom-updated", onPanaramaZoomChange);
    };
  }, [panoramaViewer]);

  const panoramaActive = isPanorama && panoramaMode && panoramaViewer;

  const zoomInProps: ButtonProps | undefined = panoramaActive
    ? {
        disabled: !!(panoramaZoom && panoramaZoom >= 100),
        onClick: () => panoramaViewer.zoomIn(20),
      }
    : undefined;

  const zoomOutProps: ButtonProps | undefined = panoramaActive
    ? {
        disabled: !!(panoramaZoom && panoramaZoom <= 0),
        onClick: () => panoramaViewer.zoomOut(20),
      }
    : undefined;

  const modeToggleProps: ButtonProps | undefined = isPanorama
    ? {
        icon: panoramaActive ? <PhotoIcon /> : <PanoramaIcon />,
        title: msgTogglePanorama,
        onClick: togglePanoramaMode,
      }
    : undefined;

  const fullscreenProps: ButtonProps | undefined = panoramaActive
    ? {
        icon: <FullscreenIcon />,
        onClick: () => panoramaViewer.enterFullscreen(),
      }
    : undefined;

  return {
    panoramaActive,
    zoomInProps,
    zoomOutProps,
    modeToggleProps,
    fullscreenProps,
  };
}
