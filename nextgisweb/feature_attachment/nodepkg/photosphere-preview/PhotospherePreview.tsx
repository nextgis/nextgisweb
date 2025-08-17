import { Viewer } from "@photo-sphere-viewer/core";
import type { ViewerConfig } from "@photo-sphere-viewer/core";
import { useEffect, useRef } from "react";

import "@photo-sphere-viewer/core/index.css";
import "./PhotospherePreview.less";

export interface PhotospherePreviewProps
    extends Omit<ViewerConfig, "container"> {
    url: string | Promise<string>;
    onReady?: (viewer: Viewer | null) => void;
}

export default function PhotospherePreview({
    url,
    onReady,
    ...viewerConfig
}: PhotospherePreviewProps) {
    const photosphereWrapper = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let viewer: Viewer | undefined;
        if (photosphereWrapper.current) {
            viewer = new Viewer({
                container: photosphereWrapper.current,
                panorama: url,
                size: { height: "100%", width: "100%" },
                navbar: ["zoom", "fullscreen"],
                ...viewerConfig,
            });
            onReady?.(viewer);
        }

        return () => {
            if (viewer) {
                viewer.destroy();
                onReady?.(null);
            }
        };
    }, [onReady, url, viewerConfig]);

    return (
        <div
            ref={photosphereWrapper}
            style={{ height: "100%", width: "100%", pointerEvents: "auto" }}
        />
    );
}
