import { useMemo, useEffect, useRef } from "react";
import { PropTypes } from "prop-types";

import "./InfoPanel.less";

const zoomToFeature = (display, resourceId, featureId) => {
    display
        .featureHighlighter
        .highlightFeatureById(featureId, resourceId)
        .then(feature => {
            display.map.zoomToFeature(feature);
        });
};

export const InfoPanel = ({ description, display }) => {
    const nodeRef = useRef();

    const content = useMemo(() => {
        return <div
            className="content"
            ref={nodeRef}
            dangerouslySetInnerHTML={{ __html: description }}
        >
        </div>;
    }, []);

    useEffect(() => {
        if (!nodeRef || !nodeRef.current) {
            console.warn("InfoPanel: nodeRef | nodeRef.current are empty");
            return;
        }

        nodeRef.current.querySelectorAll("a, span").forEach((el) => {
            const tagName = el.tagName.toLowerCase();
            const linkText = el.getAttribute((tagName === "a") ? "href" : "data-target");
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
        <div className="info-panel">
            {content}
        </div>
    );
};

InfoPanel.propTypes = {
    description: PropTypes.string,
    display: PropTypes.object
};
