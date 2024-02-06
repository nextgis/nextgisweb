import { Viewer } from "@photo-sphere-viewer/core";
import { useEffect, useRef } from "react";

import "@photo-sphere-viewer/core/index.css";
import "./PhotospherePreview.less";

interface PhotospherePreviewProps {
    url: string | Promise<string>;
}

export default function PhotospherePreview({ url }: PhotospherePreviewProps) {
    const photosphereWrapper = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let viewer: Viewer | undefined;
        if (photosphereWrapper.current) {
            viewer = new Viewer({
                container: photosphereWrapper.current,
                panorama: url,
                size: { height: "100%", width: "100%" },
                navbar: ["zoom", "fullscreen"],
            });
        }

        return () => {
            if (viewer) {
                viewer.destroy();
            }
        };
    }, [photosphereWrapper, url]);

    return (
        <div
            ref={photosphereWrapper}
            style={{ height: "100%", width: "100%", pointerEvents: "auto" }}
        />
    );
}
