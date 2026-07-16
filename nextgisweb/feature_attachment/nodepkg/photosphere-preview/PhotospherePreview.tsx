import { Viewer } from "@photo-sphere-viewer/core";
import type { ViewerConfig } from "@photo-sphere-viewer/core";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

import "@photo-sphere-viewer/core/index.css";
import "./PhotospherePreview.less";

export interface PhotospherePreviewProps extends Pick<ViewerConfig, "navbar"> {
  url: string | Promise<string>;
  onReady?: (viewer: Viewer | null) => void;
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

export default function PhotospherePreview({
  url,
  onReady,
  navbar,
}: PhotospherePreviewProps) {
  const [container, setRef] = useDomElement();

  const urlRef = useRef(url);

  const viewerRef = useRef<Viewer | null>(null);

  const handleReady = useEffectEvent((viewer: Viewer | null) => {
    onReady?.(viewer);
  });

  useEffect(() => {
    let viewer: Viewer | null;

    const onViewerReady = () => {
      if (viewer) {
        handleReady(viewer);
      }
    };

    if (container) {
      viewer = new Viewer({
        container,
        panorama: urlRef.current,
        size: { height: "100%", width: "100%" },
        navbar,
      });
      viewerRef.current = viewer;
      viewer.addEventListener("ready", onViewerReady);
    }

    return () => {
      if (viewer) {
        viewer.removeEventListener("ready", onViewerReady);
        handleReady(null);
        viewer = null;
      }
    };
  }, [container, navbar]);

  // from here https://github.com/Elius94/react-photo-sphere-viewer/blob/e475d1e0de6a5bb814d96ff55b738bbd67eca722/src/index.tsx#L535
  useEffect(() => {
    const viewer: Viewer | null = viewerRef.current;
    if (viewer && viewer.container && viewer.container.parentNode) {
      if (viewer && viewer.container && viewer.container.parentNode) {
        (
          viewer.renderer as unknown as {
            renderer?: { dispose: () => void };
          }
        )?.renderer?.dispose();
        (
          viewer.renderer as unknown as {
            renderer?: { forceContextLoss: () => void };
          }
        )?.renderer?.forceContextLoss();
        viewer.destroy();
      }
    }
  }, []);

  useEffect(() => {
    urlRef.current = url;
    if (!viewerRef.current) return;

    viewerRef.current!.setPanorama(url, {});
  }, [url]);

  return (
    <div
      ref={setRef}
      style={{ height: "100%", width: "100%", pointerEvents: "auto" }}
    />
  );
}
