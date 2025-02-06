import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import { Alert } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { useLoading } from "@nextgisweb/gui/hook/useLoading";
import { executeWithMinDelay } from "@nextgisweb/gui/util/executeWithMinDelay";
import type { GetRequestOptions } from "@nextgisweb/pyramid/api/type";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import webmapSettings from "@nextgisweb/pyramid/settings!webmap";
import type { Display } from "@nextgisweb/webmap/display";

import { PanelContainer } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import { CoordinatesSwitcher } from "./CoordinatesSwitcher";
import { FeatureEditButton } from "./FeatureEditButton";
import type IdentifyStore from "./IdentifyStore";
import { FeatureInfoSection } from "./component/FeatureInfoSection";
import { FeatureSelector } from "./component/FeatureSelector";
import type { FeatureInfo, IdentifyInfo } from "./identification";
import { identifyInfoToFeaturesInfo } from "./util/identifyInfoToFeaturesInfo";

import "./IdentifyPanel.less";

// prettier-ignore
const msgTipIdent = gettext("To get feature information, click on the map with the left mouse button. Make sure that other tools are turned off.");
const msgLoad = gettext("Retrieving object information...");
const msgNotFound = gettext("No objects were found at the click location.");

const loadFeatureItem = async (
    display: Display,
    identifyInfo: IdentifyInfo,
    featureInfo: FeatureInfo,
    opt?: GetRequestOptions
) => {
    if (display.identify) {
        const featureItem = await executeWithMinDelay(
            display.identify?.highlightFeature(identifyInfo, featureInfo, opt),
            {
                minDelay: 700,
                signal: opt?.signal,
            }
        );
        return featureItem;
    }
};

const IdentifyPanel = observer<PanelPluginWidgetProps<IdentifyStore>>(
    ({ display, store }) => {
        const [featureInfo, setFeatureInfo] = useState<FeatureInfo>();
        const [featureItem, setFeatureItem] = useState<FeatureItem>();

        const { trackPromise, isLoading } = useLoading();
        const { makeSignal, abort } = useAbortController();

        const identifyInfo = store.identifyInfo;

        const isNotFound =
            identifyInfo && identifyInfo.response.featureCount === 0;

        useEffect(() => {
            if (isNotFound) {
                setFeatureInfo(undefined);
                setFeatureItem(undefined);
            }
        }, [isNotFound]);

        const updateFeatureItem = useCallback(
            async (featureInfo: FeatureInfo | undefined) => {
                abort();

                setFeatureItem(undefined);

                if (!featureInfo) {
                    return;
                }
                const signal = makeSignal();

                try {
                    const featureItemLoaded = await trackPromise(
                        loadFeatureItem(display, identifyInfo!, featureInfo, {
                            signal,
                        })
                    );

                    setFeatureItem(featureItemLoaded);
                } catch (er) {
                    if ((er as Error).name !== "AbortError") {
                        errorModal(er as ApiError);
                    }
                }
            },
            [abort, makeSignal, trackPromise, display, identifyInfo]
        );

        const onFeatureChange = useCallback(
            (featureInfo: FeatureInfo | undefined) => {
                setFeatureInfo(featureInfo);
                updateFeatureItem(featureInfo);
            },
            [updateFeatureItem]
        );

        const featuresInfoList = useMemo(() => {
            abort();
            if (!identifyInfo) return [];
            const options = identifyInfoToFeaturesInfo(identifyInfo, display);
            if (options.length) {
                const first = options[0];
                onFeatureChange(first);
            }
            return options;
        }, [identifyInfo, display, onFeatureChange, abort]);

        let loadElement = null;
        if (isLoading) {
            loadElement = (
                <div className="load-row">
                    <div className="load">
                        <div>{msgLoad}</div>
                    </div>
                </div>
            );
        }

        return (
            <PanelContainer
                className="ngw-webmap-panel-identify"
                title={store.title}
                close={store.close}
                prolog={
                    !identifyInfo ? (
                        <Alert
                            className="alert"
                            message={msgTipIdent}
                            showIcon={false}
                            type="info"
                            banner
                        />
                    ) : isNotFound ? (
                        <Alert
                            message={msgNotFound}
                            type="warning"
                            showIcon
                            banner
                        />
                    ) : (
                        <FeatureSelector
                            display={display}
                            featureInfo={featureInfo}
                            featureItem={featureItem}
                            featuresInfoList={featuresInfoList}
                            onFeatureChange={onFeatureChange}
                        />
                    )
                }
                epilog={
                    identifyInfo && (
                        <CoordinatesSwitcher
                            display={display}
                            identifyInfo={identifyInfo}
                        />
                    )
                }
                sectionAccent={true}
                components={{
                    prolog: PanelContainer.Unpadded,
                    epilog: PanelContainer.Unpadded,
                }}
            >
                {loadElement}
                {featureItem && featureInfo && (
                    <FeatureInfoSection
                        showGeometryInfo={webmapSettings.show_geometry_info}
                        measurementSrid={webmapSettings.measurement_srid}
                        showAttributes={webmapSettings.identify_attributes}
                        resourceId={featureInfo.layerId}
                        featureItem={featureItem}
                        attributePanelAction={
                            <FeatureEditButton
                                display={display}
                                resourceId={featureInfo.layerId}
                                featureId={featureItem.id}
                                onUpdate={() => updateFeatureItem(featureInfo)}
                            />
                        }
                    />
                )}
            </PanelContainer>
        );
    }
);

IdentifyPanel.displayName = "IdentifyPanel";
export default IdentifyPanel;
