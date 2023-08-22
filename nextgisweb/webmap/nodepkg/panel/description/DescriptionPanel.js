import { useMemo, useEffect, useRef } from "react";

import { CloseButton } from "../header/CloseButton";

import "./DescriptionPanel.less";

const zoomToFeature = (display, resourceId, featureId) => {
    display.featureHighlighter
        .highlightFeatureById(featureId, resourceId)
        .then((feature) => {
            display.map.zoomToFeature(feature);
        });
};

export function DescriptionPanel({ display, close }) {
    const nodeRef = useRef();

    const content = useMemo(() => {
        const content = display.config.webmapDescription;
        return (
            <div
                className="content"
                ref={nodeRef}
                dangerouslySetInnerHTML={{ __html: content }}
            />
        );
    }, []);

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
            if (/^\d+:\d+$/.test(linkText)) {
                el.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const [resourceId, featureId] = linkText.split(":");
                    zoomToFeature(display, resourceId, featureId);
                });
            }
        });
    }, []);

    return (
        <div className="ngw-webmap-description-panel">
            <CloseButton {...{ close }} />
            {content}
        </div>
    );
}
