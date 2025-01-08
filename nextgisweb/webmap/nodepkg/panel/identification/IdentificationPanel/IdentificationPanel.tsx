import { useCallback, useEffect, useMemo, useState } from "react";

import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import { Alert } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { useLoading } from "@nextgisweb/gui/hook/useLoading";
import { executeWithMinDelay } from "@nextgisweb/gui/util/executeWithMinDelay";
import { route } from "@nextgisweb/pyramid/api";
import type { GetRequestOptions } from "@nextgisweb/pyramid/api/type";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import topic from "@nextgisweb/webmap/compat/topic";

import { PanelContainer } from "../../component";
import { CoordinatesSwitcher } from "../CoordinatesSwitcher";
import type {
    FeatureInfo,
    IdentificationPanelProps,
    IdentifyInfo,
} from "../identification";

import { FeatureInfoSection } from "./component/FeatureInfoSection";
import { FeatureSelector } from "./component/FeatureSelector";
import { identifyInfoToFeaturesInfo } from "./util/identifyInfoToFeaturesInfo";

import "./IdentificationPanel.less";

// prettier-ignore
const msgTipIdent = gettext("To get feature information, click on the map with the left mouse button. Make sure that other tools are turned off.");
const msgLoad = gettext("Retrieving object information...");
const msgNotFound = gettext("No objects were found at the click location.");

const highlightFeature = (
    featureItem: FeatureItem,
    featureInfo: FeatureInfo
) => {
    const { label } = featureInfo;

    topic.publish("feature.highlight", {
        geom: featureItem.geom,
        featureId: featureItem.id,
        layerId: featureInfo.layerId,
        featureInfo: { ...featureItem, labelWithLayer: label },
    });
};

const loadFeatureItem = async (
    identifyInfo: IdentifyInfo,
    featureInfo: FeatureInfo,
    opt?: GetRequestOptions
) => {
    const layerResponse = identifyInfo.response[featureInfo.layerId];
    const featureResponse = layerResponse.features[featureInfo.idx];

    const featureItem = await executeWithMinDelay(
        route("feature_layer.feature.item", {
            id: featureResponse.layerId,
            fid: featureResponse.id,
        }).get(opt),
        {
            onRealExecute: (res) => {
                highlightFeature(res, featureInfo);
            },
            minDelay: 700,
            signal: opt?.signal,
        }
    );

    return featureItem;
};

export default function IdentificationPanel({
    display,
    identifyInfo,
    title,
    close,
}: IdentificationPanelProps) {
    const [featureInfo, setFeatureInfo] = useState<FeatureInfo>();
    const [featureItem, setFeatureItem] = useState<FeatureItem>();

    const { trackPromise, isLoading } = useLoading();

    const { makeSignal, abort } = useAbortController();

    const isNotFound = identifyInfo && identifyInfo.response.featureCount === 0;

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
                    loadFeatureItem(identifyInfo, featureInfo, { signal })
                );

                setFeatureItem(featureItemLoaded);
            } catch (er) {
                if ((er as Error).name !== "AbortError") {
                    errorModal(er as ApiError);
                }
            }
        },
        [identifyInfo, abort, trackPromise, makeSignal]
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
            title={title}
            close={close}
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
                <CoordinatesSwitcher
                    display={display}
                    identifyInfo={identifyInfo}
                />
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
                    display={display}
                    featureInfo={featureInfo}
                    featureItem={featureItem}
                    onUpdate={() => updateFeatureItem(featureInfo)}
                />
            )}
        </PanelContainer>
    );
}
