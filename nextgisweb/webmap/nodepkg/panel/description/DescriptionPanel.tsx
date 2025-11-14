import { observer } from "mobx-react-lite";
import { useRef } from "react";

import { DescriptionHtml } from "@nextgisweb/gui/description";
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
    display.highlighter
        .highlightById(featureId, resourceId)
        .then(({ geom }) => {
            display.map.zoomToGeom(geom);
        });
};

const DescriptionPanel = observer<PanelPluginWidgetProps<DescriptionStore>>(
    ({ store, display }) => {
        const nodeRef = useRef<HTMLDivElement>(null);

        const content = store.content;

        const handleOnLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            const href = e?.currentTarget.getAttribute("href");
            e?.currentTarget.setAttribute("target", "_blank");

            if (href && /^\d+:\d+$/.test(href)) {
                e.preventDefault();
                e.stopPropagation();
                const [resourceId, featureId] = href.split(":");
                zoomToFeature(display, Number(resourceId), Number(featureId));
                return true;
            }
            return false;
        };

        return (
            <PanelContainer
                className="ngw-webmap-panel-description"
                close={() => {}}
                components={{ title: () => undefined }}
            >
                <DescriptionHtml
                    className="content"
                    variant="compact"
                    content={content ?? ""}
                    elementRef={nodeRef}
                    onLinkClick={handleOnLinkClick}
                />
            </PanelContainer>
        );
    }
);

DescriptionPanel.displayName = "DescriptionPanel";
export default DescriptionPanel;
