import { Viewer } from "@photo-sphere-viewer/core";
import type { ViewerConfig } from "@photo-sphere-viewer/core";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import type { MarkerConfig } from "@photo-sphere-viewer/markers-plugin";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { iconHtml } from "@nextgisweb/pyramid/icon";

import type { PanoramaMarker } from "../type";

import HotspotIcon from "@nextgisweb/icon/material/radio_button_checked/fill";

import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";
import "./PhotospherePreview.less";

const HOTSPOT_ICON_MARKUP = iconHtml(HotspotIcon);

export interface PhotospherePreviewNode {
  id: string;
  url: string;
  description?: string;
  markers?: PanoramaMarker[];
}

export interface PhotospherePreviewProps extends Pick<ViewerConfig, "navbar"> {
  nodes: PhotospherePreviewNode[];
  currentNodeId: string;
  onReady?: (viewer: Viewer | null) => void;
  onNavigate?: (nodeId: string) => void;
}

function useDomElement(): [
  HTMLDivElement | undefined,
  (r: HTMLDivElement) => void,
] {
  const [element, setElement] = useState<HTMLDivElement>();
  const ref = useCallback(
    (r: HTMLDivElement) => {
      if (r && r !== element) {
        setElement(r);
      }
    },
    [element]
  );
  return [element, ref];
}

function navigationToMarkers(
  points: PanoramaMarker[] | undefined,
  nodesMap: Map<string, PhotospherePreviewNode>
): MarkerConfig[] {
  return (points ?? [])
    .filter((point) => nodesMap.has(point.target))
    .map((point) => {
      const description = nodesMap.get(point.target)?.description;

      return {
        id: point.target,
        position: { yaw: point.yaw, pitch: point.pitch },
        html: `<div class="ngw-photosphere-hotspot">${HOTSPOT_ICON_MARKUP}</div>`,
        anchor: "center center",
        data: { targetId: point.target },
        ...(description ? { tooltip: description } : {}),
      };
    });
}

function disposeViewerRenderer(viewer: Viewer) {
  const renderer = (
    viewer.renderer as unknown as {
      renderer?: { dispose: () => void; forceContextLoss: () => void };
    }
  )?.renderer;
  renderer?.dispose();
  renderer?.forceContextLoss();
}

export default function PhotospherePreview({
  nodes,
  currentNodeId,
  onReady,
  onNavigate,
  navbar,
}: PhotospherePreviewProps) {
  const [container, setRef] = useDomElement();

  const nodesMap = useMemo(() => {
    const map = new Map<string, PhotospherePreviewNode>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);
  const nodesMapRef = useRef(nodesMap);
  nodesMapRef.current = nodesMap;

  const currentNodeIdRef = useRef(currentNodeId);

  const viewerRef = useRef<Viewer | null>(null);
  const appliedNodeIdRef = useRef<string | null>(null);

  const handleReady = useEffectEvent((viewer: Viewer | null) => {
    onReady?.(viewer);
  });

  const handleNavigate = useEffectEvent((nodeId: string) => {
    onNavigate?.(nodeId);
  });

  useEffect(() => {
    let viewer: Viewer | null;
    let markers: MarkersPlugin | null;

    const startNode = nodesMapRef.current.get(currentNodeIdRef.current);

    const onSelectMarker = (e: {
      type: string;
      marker?: { data?: unknown };
    }) => {
      const targetId = (e.marker?.data as { targetId?: string } | undefined)
        ?.targetId;
      if (targetId) {
        handleNavigate(targetId);
      }
    };

    const onViewerReady = () => {
      if (viewer) {
        handleReady(viewer);
      }
    };

    if (container && startNode) {
      viewer = new Viewer({
        container,
        size: { height: "100%", width: "100%" },
        navbar,
        panorama: startNode.url,
        plugins: [
          MarkersPlugin.withConfig({
            markers: navigationToMarkers(
              startNode.markers,
              nodesMapRef.current
            ),
          }),
        ],
      });
      viewerRef.current = viewer;
      appliedNodeIdRef.current = startNode.id;
      viewer.addEventListener("ready", onViewerReady);

      markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
      markers.addEventListener("select-marker", onSelectMarker);
    }

    return () => {
      if (viewer) {
        viewer.removeEventListener("ready", onViewerReady);
        markers?.removeEventListener("select-marker", onSelectMarker);
        handleReady(null);
        viewer = null;
        markers = null;
      }
    };
  }, [container, navbar]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer && viewer.container && viewer.container.parentNode) {
      disposeViewerRenderer(viewer);
      viewer.destroy();
    }
  }, []);

  useEffect(() => {
    currentNodeIdRef.current = currentNodeId;

    const viewer = viewerRef.current;
    if (!viewer) return;

    if (appliedNodeIdRef.current === currentNodeId) return;

    const node = nodesMapRef.current.get(currentNodeId);
    if (!node) return;

    appliedNodeIdRef.current = currentNodeId;

    const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
    markers.clearMarkers();

    viewer.setCursor("wait");

    const onPanoramaLoaded = () => {
      viewer.setCursor("default");
    };
    viewer.addEventListener("panorama-loaded", onPanoramaLoaded);

    void viewer
      .setPanorama(node.url, {
        transition: { rotation: false, speed: 500 },
        showLoader: false,
      })
      .then(() => {
        if (viewerRef.current === viewer) {
          markers.setMarkers(
            navigationToMarkers(node.markers, nodesMapRef.current)
          );
        }
      });

    return () => {
      viewer.removeEventListener("panorama-loaded", onPanoramaLoaded);
    };
  }, [currentNodeId]);

  return (
    <div
      ref={setRef}
      style={{ height: "100%", width: "100%", pointerEvents: "auto" }}
    />
  );
}
