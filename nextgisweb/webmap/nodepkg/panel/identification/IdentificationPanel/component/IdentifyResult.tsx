import { publish } from "dojo/topic";
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

import { CoordinatesSwitcher } from "../../CoordinatesSwitcher";
import { PanelContentContainer } from "../../PanelContentContainer";
import type {
    FeatureInfo,
    IdentifyInfo,
    IdentifyResultProps,
} from "../../identification";
import { identifyInfoToFeaturesInfo } from "../util/identifyInfoToFeaturesInfo";

import { FeatureInfoSection } from "./FeatureInfoSection";
import { FeatureSelector } from "./FeatureSelector";

const msgNotFound = gettext("No objects were found at the click location.");
const msgLoad = gettext("Retrieving object information...");

const highlightFeature = (
    featureItem: FeatureItem,
    featureInfo: FeatureInfo
) => {
    const { label } = featureInfo;

    publish("feature.highlight", {
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

export function IdentifyResult({ identifyInfo, display }: IdentifyResultProps) {
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

    if (!identifyInfo) {
        return null;
    }

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

    const coordinatesPanel = (
        <PanelContentContainer
            marginAll
            content={
                <CoordinatesSwitcher
                    display={display}
                    identifyInfo={identifyInfo}
                />
            }
        />
    );

    let noFoundElement = null;
    if (isNotFound) {
        noFoundElement = (
            <PanelContentContainer
                noMarginX
                fill={
                    <Alert
                        message={msgNotFound}
                        type="warning"
                        banner
                        showIcon
                    />
                }
            />
        );
    }

    let featureSelector;
    if (!isNotFound) {
        featureSelector = (
            <FeatureSelector
                display={display}
                featureInfo={featureInfo}
                featureItem={featureItem}
                featuresInfoList={featuresInfoList}
                onFeatureChange={onFeatureChange}
            />
        );
    }

    let tabsElement;
    if (featureItem && featureInfo) {
        tabsElement = (
            <FeatureInfoSection
                display={display}
                featureInfo={featureInfo}
                featureItem={featureItem}
                onUpdate={() => updateFeatureItem(featureInfo)}
            />
        );
    }

    return (
        <>
            <div className="top">{featureSelector}</div>
            <div className="center">
                {loadElement}
                {tabsElement}
                {noFoundElement}
            </div>
            <div className="bottom">{coordinatesPanel}</div>
        </>
    );
}
