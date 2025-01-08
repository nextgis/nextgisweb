import { useEffect, useMemo, useRef } from "react";

import type { Display } from "@nextgisweb/webmap/display";
import type { PanelComponentProps } from "@nextgisweb/webmap/panels-manager/type";

import { PanelContainer } from "../component";

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

export function DescriptionPanel({ display, content }: DescriptionPanelProps) {
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
        <PanelContainer
            className="ngw-webmap-panel-description"
            components={{ title: () => undefined }}
        >
            {contentDiv}
        </PanelContainer>
    );
}
