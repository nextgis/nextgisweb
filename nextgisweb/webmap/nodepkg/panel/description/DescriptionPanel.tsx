import { useEffect, useMemo, useRef } from "react";

import type { Display } from "@nextgisweb/webmap/display";
import type { PanelComponentProps } from "@nextgisweb/webmap/panels-manager/type";

import { CloseButton } from "../header/CloseButton";

import "./DescriptionPanel.less";

export interface DescriptionPanelProps extends PanelComponentProps {
    content?: string | HTMLElement | null;
}

const zoomToFeature = (
    display: Display,
    resourceId: number,
    featureId: number
) => {
    display.featureHighlighter
        .highlightFeatureById(featureId, resourceId)
        .then((feature) => {
            display.map.zoomToFeature(feature);
        });
};

export default function DescriptionPanel({
    display,
    close,
    content,
}: DescriptionPanelProps) {
    const nodeRef = useRef<HTMLDivElement>(null);

    const contentDiv = useMemo(() => {
        return (
            <div
                className="content"
                ref={nodeRef}
                dangerouslySetInnerHTML={{
                    __html:
                        content instanceof HTMLElement ||
                        typeof content === "string"
                            ? content
                            : display.config.webmapDescription,
                }}
            />
        );
    }, [content, display.config.webmapDescription]);

    useEffect(() => {
        if (!nodeRef || !nodeRef.current) {
            console.warn("InfoPanel: nodeRef | nodeRef.current are empty");
            return;
        }

        nodeRef.current.querySelectorAll("a, span").forEach((el) => {
            const tagName = el.tagName.toLowerCase();
            const linkText = el.getAttribute(
                tagName === "a" ? "href" : "data-target"
            );
            if (linkText && /^\d+:\d+$/.test(linkText)) {
                el.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const [resourceId, featureId] = linkText.split(":");
                    zoomToFeature(
                        display,
                        Number(resourceId),
                        Number(featureId)
                    );
                });
            }
        });
    }, [display]);

    return (
        <div className="ngw-webmap-description-panel">
            <CloseButton close={close} />
            {contentDiv}
        </div>
    );
}
