import { Suspense, lazy, useEffect, useMemo, useState } from "react";

import GeometryInfo from "@nextgisweb/feature-layer/geometry-info/";
import { gettext } from "@nextgisweb/pyramid/i18n";
import webmapSettings from "@nextgisweb/pyramid/settings!webmap";

import { FeatureEditButton } from "../../FeatureEditButton";
import { PanelContentContainer } from "../../PanelContentContainer";
import { getExtensionsComps } from "../../extensions";
import type { FeatureTabsProps as FeatureInfoProps } from "../../identification";
import { FieldsTable } from "../component/FieldsTable";

import ListIcon from "@nextgisweb/icon/material/list/outline";
import EarthIcon from "@nextgisweb/icon/material/public/outline";

const msgLoading = gettext("Loading...");

export function FeatureInfoSection({
    display,
    featureInfo,
    featureItem,
    onUpdate,
}: FeatureInfoProps) {
    const [extComps, setExtComps] = useState<JSX.Element[]>([]);

    useEffect(() => {
        if (!featureItem.extensions) {
            return;
        }

        const makeExtensionComps = async () => {
            const newExtComps: JSX.Element[] = [];
            const extensionsComp = await getExtensionsComps();
            extensionsComp.forEach((comp, key) => {
                const ExtensionComponent = lazy(async () => ({
                    default: await comp,
                }));
                newExtComps.push(
                    <Suspense
                        key={key}
                        // FIXME: Not informative. It became 'Loading...loading...Loading'
                        fallback={msgLoading}
                    >
                        <ExtensionComponent
                            featureItem={featureItem}
                            resourceId={featureInfo.layerId}
                        ></ExtensionComponent>
                    </Suspense>
                );
            });
            setExtComps(newExtComps);
        };

        makeExtensionComps();
    }, [featureInfo.layerId, featureItem]);

    const items = useMemo(() => {
        const items_ = [];
        if (
            webmapSettings.identify_attributes &&
            Object.keys(featureItem.fields).length > 0
        ) {
            const attrElement = (
                <div key="identify-attributes">
                    <PanelContentContainer
                        icon={<ListIcon />}
                        title={gettext("Attributes")}
                        control={
                            <FeatureEditButton
                                display={display}
                                resourceId={featureInfo.layerId}
                                featureId={featureItem.id}
                                onUpdate={onUpdate}
                            />
                        }
                        noMarginX
                        content={
                            <FieldsTable
                                featureInfo={featureInfo}
                                featureItem={featureItem}
                            />
                        }
                    />
                </div>
            );
            items_.push(attrElement);
        }

        if (webmapSettings.show_geometry_info) {
            const geomElement = (
                <div key="geometry-info">
                    <PanelContentContainer
                        icon={<EarthIcon />}
                        title={gettext("Geometry")}
                        content={
                            <GeometryInfo
                                layerId={featureInfo.layerId}
                                featureId={featureItem.id}
                            />
                        }
                    />
                </div>
            );
            items_.push(geomElement);
        }
        return items_;
    }, [display, featureInfo, featureItem, onUpdate]);

    return (
        <>
            {items}
            {extComps}
        </>
    );
}
