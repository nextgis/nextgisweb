import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useRef } from "react";

import type { Display } from "@nextgisweb/webmap/display";

import { PanelContainer } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import type DescriptionStore from "./DescriptionStore";

import "./DescriptionPanel.less";

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

const DescriptionPanel = observer<PanelPluginWidgetProps<DescriptionStore>>(
    ({ store, display }) => {
        const nodeRef = useRef<HTMLDivElement>(null);

        const content = store.content;

        const contentDiv = useMemo(() => {
            return (
                <div
                    className="content"
                    ref={nodeRef}
                    dangerouslySetInnerHTML={{
                        __html: content ?? "",
                    }}
                />
            );
        }, [content]);

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
                close={() => {}}
                components={{ title: () => undefined }}
            >
                {contentDiv}
            </PanelContainer>
        );
    }
);

DescriptionPanel.displayName = "DescriptionPanel";
export default DescriptionPanel;
