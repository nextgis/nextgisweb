import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";

import GeometryInfo from "@nextgisweb/feature-layer/geometry-info";
import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { PanelSection } from "@nextgisweb/webmap/panel/component";

import { getExtensionsComps } from "../extensions";

import { FieldsTable } from "./FieldsTable";

import ListIcon from "@nextgisweb/icon/material/list/outline";
import EarthIcon from "@nextgisweb/icon/material/public/outline";

const msgLoading = gettext("Loading...");

export interface FeatureInfoSectionProps {
    resourceId: number;
    featureItem: FeatureItem;
    showAttributes?: boolean;
    measurementSrid?: number;
    showGeometryInfo?: boolean;
    showGeometryPreview?: boolean;
    attributePanelAction?: ReactElement;
}

export function FeatureInfoSection({
    resourceId,
    featureItem,
    showAttributes = true,
    measurementSrid,
    showGeometryInfo = false,
    showGeometryPreview,
    attributePanelAction,
}: FeatureInfoSectionProps) {
    const [extComps, setExtComps] = useState<React.ReactElement[]>([]);

    useEffect(() => {
        if (!featureItem.extensions) {
            return;
        }

        const makeExtensionComps = async () => {
            const newExtComps: React.ReactElement[] = [];
            const extensionsComp = await getExtensionsComps();
            extensionsComp.forEach((comp, key) => {
                const ExtensionComponent = lazy(comp);
                newExtComps.push(
                    <Suspense
                        key={key}
                        // FIXME: Not informative. It became 'Loading...loading...Loading'
                        fallback={msgLoading}
                    >
                        <ExtensionComponent
                            featureItem={featureItem}
                            resourceId={resourceId}
                        ></ExtensionComponent>
                    </Suspense>
                );
            });
            setExtComps(newExtComps);
        };

        makeExtensionComps();
    }, [resourceId, featureItem]);

    const items = useMemo(() => {
        const items_ = [];
        if (showAttributes && Object.keys(featureItem.fields).length > 0) {
            const attrElement = (
                <PanelSection
                    key="attributes"
                    icon={<ListIcon />}
                    title={gettext("Attributes")}
                    suffix={attributePanelAction}
                >
                    <FieldsTable
                        resourceId={resourceId}
                        featureItem={featureItem}
                    />
                </PanelSection>
            );
            items_.push(attrElement);
        }

        if (showGeometryInfo || showGeometryPreview) {
            const geomElement = (
                <PanelSection
                    key="geometry"
                    icon={<EarthIcon />}
                    title={gettext("Geometry")}
                >
                    <GeometryInfo
                        srid={measurementSrid}
                        showInfo={showGeometryInfo}
                        showPreview={showGeometryPreview}
                        resourceId={resourceId}
                        featureId={featureItem.id}
                    />
                </PanelSection>
            );
            items_.push(geomElement);
        }
        return items_;
    }, [
        attributePanelAction,
        showGeometryPreview,
        showGeometryInfo,
        measurementSrid,
        showAttributes,
        featureItem,
        resourceId,
    ]);

    return <>{[...items, ...extComps]}</>;
}
