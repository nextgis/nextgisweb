import { observer } from "mobx-react-lite";

import { LoadingWrapper } from "@nextgisweb/gui/component";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { FeatureInfoSection } from "@nextgisweb/webmap/panel/identify/component/FeatureInfoSection";

export interface FeatureDisplayWidget {
    resourceId: number;
    featureId: number;
}

export const FeatureDisplayWidget = observer<FeatureDisplayWidget>(
    ({ resourceId, featureId }) => {
        const { data: featureItem, isLoading } = useRouteGet(
            "feature_layer.feature.item",
            {
                id: resourceId,
                fid: featureId,
            }
        );

        if (isLoading) {
            return <LoadingWrapper />;
        }

        return (
            <div className="ngw-feature-layer-editor">
                <FeatureInfoSection
                    showGeometryInfo
                    resourceId={resourceId}
                    featureItem={featureItem}
                />
            </div>
        );
    }
);

FeatureDisplayWidget.displayName = "FeatureDisplayWidget";
