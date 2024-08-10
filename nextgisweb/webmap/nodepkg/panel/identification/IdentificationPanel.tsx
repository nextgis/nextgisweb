import { publish } from "dojo/topic";
import delay from "lodash-es/delay";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";

import GeometryInfo from "@nextgisweb/feature-layer/geometry-info/";
import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import { Alert, Button, Select, Table, Tooltip } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import webmapSettings from "@nextgisweb/pyramid/settings!webmap";

import type { DojoDisplay } from "../../type";
import type { StoreItem } from "../../type/DojoDisplay";
import { PanelHeader } from "../header";

import { CoordinatesSwitcher } from "./CoordinatesSwitcher";
import { FeatureEditButton } from "./FeatureEditButton";
import { getExtensionsComps } from "./extensions";
import { fieldValuesToDataSource, getFieldsInfo } from "./fields";
import type { FieldDataItem } from "./fields";
import type {
    FeatureInfo,
    FeatureSelectorProps,
    FeatureTabsProps as FeatureInfoProps,
    FieldsTableProps,
    IdentificationPanelProps,
    IdentifyInfo,
    IdentifyResultProps,
} from "./identification";

import ListIcon from "@nextgisweb/icon/material/list/outline";
import EarthIcon from "@nextgisweb/icon/material/public/outline";
import ZoomInMapIcon from "@nextgisweb/icon/material/zoom_in_map/outline";

import "./IdentificationPanel.less";
import "./PanelContentContainer.less";

const msgTipTitle = gettext("How does it work");
const msgTipIdent = gettext(
    "To get feature information, click on the map with the left mouse button. Make sure that other tools are turned off."
);
const msgNotFound = gettext("No objects were found at the click location.");
const msgLoad = gettext("Retrieving object information...");
const msgLoading = gettext("Loading...");

const identifyInfoToFeaturesInfo = (
    identifyInfo: IdentifyInfo,
    display: DojoDisplay
): FeatureInfo[] => {
    if (!identifyInfo) {
        return [];
    }

    const { response, layerLabels } = identifyInfo;
    const layersResponse = Object.keys(response);
    const featuresInfo: FeatureInfo[] = [];

    display.itemStore.fetch({
        queryOptions: { deep: true },
        query: { type: "layer" },
        onItem: (item: StoreItem) => {
            const itemObj = display.itemStore.dumpItem(item);
            const layerId = itemObj.layerId as number;
            const layerIdx = layersResponse.indexOf(layerId.toString());

            const layerResponse = response[layerId];
            if (layerIdx === -1 || !Array.isArray(layerResponse.features)) {
                return;
            }

            layerResponse.features.forEach((f, idx) => {
                const id = f.id;
                const value = `${layerId}-${id}`;
                const label = `${f.label} (${layerLabels[layerId]})`;
                featuresInfo.push({ id, value, label, layerId, idx });
            });
            layersResponse.splice(layerIdx, 1);
        },
    });

    return featuresInfo;
};

const highlightFeature = (featureItem: FeatureItem) => {
    publish("feature.highlight", featureItem);
};

const loadFeatureItem = async (
    identifyInfo: IdentifyInfo,
    featureInfo: FeatureInfo
) => {
    const layerResponse = identifyInfo.response[featureInfo.layerId];
    const featureResponse = layerResponse.features[featureInfo.idx];

    const result = await Promise.all([
        route("feature_layer.feature.item", {
            id: featureResponse.layerId,
            fid: featureResponse.id,
        }).get(),
        new Promise((resolve) => delay(resolve, 1000)),
    ]);

    const featureItem = result[0];
    highlightFeature(featureItem);
    return featureItem;
};

const FieldsTable = ({ featureInfo, featureItem }: FieldsTableProps) => {
    const [fieldsInfo, setFieldsInfo] = useState();
    const [dataSource, setDataSource] = useState<FieldDataItem[]>();

    useEffect(() => {
        async function load() {
            const fields = await getFieldsInfo(featureInfo.layerId);
            setFieldsInfo(fields);
        }
        setDataSource(undefined);
        load();
    }, [featureItem]);

    useEffect(() => {
        if (!fieldsInfo) {
            return;
        }
        const { fields } = featureItem;
        const dataItems: FieldDataItem[] = fieldValuesToDataSource(
            fields,
            fieldsInfo
        );
        setDataSource(dataItems);
    }, [fieldsInfo]);

    const columns = [
        {
            title: gettext("Attribute"),
            dataIndex: "attr",
            key: "attr",
            className: "attr-column",
        },
        {
            title: gettext("Value"),
            dataIndex: "value",
            key: "value",
        },
    ];

    let table;
    if (dataSource) {
        table = (
            <Table
                className="fields-table"
                dataSource={dataSource}
                columns={columns}
                showHeader={false}
            />
        );
    }

    return table;
};

const FeatureInfo = ({
    display,
    featureInfo,
    featureItem,
    onUpdate,
}: FeatureInfoProps) => {
    const [extComps, setExtComps] = useState<JSX.Element[]>([]);
    const items = [];

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
                    <Suspense key={key} fallback={msgLoading}>
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
    }, [featureItem]);

    if (
        webmapSettings.identify_attributes &&
        Object.keys(featureItem.fields).length > 0
    ) {
        const attrElement = (
            <div key="identify-attributes">
                <div className="panel-content-container">
                    <div className="fill">
                        <h3>
                            <ListIcon />
                            {gettext("Attributes")}
                        </h3>
                    </div>
                    <div className="content edit-wrapper">
                        <FeatureEditButton
                            display={display}
                            resourceId={featureInfo.layerId}
                            featureId={featureItem.id}
                            onUpdate={onUpdate}
                        />
                    </div>
                </div>
                <div className="panel-content-container no-margin-x">
                    <div className="fill">
                        <FieldsTable
                            featureInfo={featureInfo}
                            featureItem={featureItem}
                        />
                    </div>
                </div>
            </div>
        );
        items.push(attrElement);
    }

    if (webmapSettings.show_geometry_info) {
        const geomElement = (
            <div key="geometry-info">
                <div className="panel-content-container">
                    <div className="fill">
                        <h3>
                            {" "}
                            <EarthIcon />
                            {gettext("Geometry")}
                        </h3>
                    </div>
                </div>
                <div className="panel-content-container">
                    <div className="fill">
                        <GeometryInfo
                            layerId={featureInfo.layerId}
                            featureId={featureItem.id}
                        />
                    </div>
                </div>
            </div>
        );
        items.push(geomElement);
    }

    return (
        <>
            {items}
            {extComps}
        </>
    );
};

const FeatureSelector = ({
    display,
    featureInfo,
    featureItem,
    featuresInfoList,
    onFeatureChange,
}: FeatureSelectorProps) => {
    if (!featureInfo) {
        return null;
    }

    const zoomTo = () => {
        if (!featureItem) return;
        display.featureHighlighter
            .highlightFeatureById(featureItem.id, featureInfo.layerId)
            .then((feature) => {
                display.map.zoomToFeature(feature);
            });
    };

    const onSelectChange = (
        value: string,
        featureInfoSelected: FeatureInfo | FeatureInfo[]
    ) => {
        const selected = Array.isArray(featureInfoSelected)
            ? featureInfoSelected[0]
            : featureInfoSelected;
        onFeatureChange(selected);
    };

    return (
        <div className="panel-content-container margin-all">
            <div className="fill">
                <Select
                    onChange={onSelectChange}
                    style={{ width: "100%" }}
                    value={featureInfo.value}
                    options={featuresInfoList}
                />
            </div>
            <div className="content">
                <Tooltip title={gettext("Zoom to feature")}>
                    <Button
                        type="link"
                        onClick={zoomTo}
                        icon={<ZoomInMapIcon />}
                    />
                </Tooltip>
            </div>
        </div>
    );
};

const IdentifyResult = ({ identifyInfo, display }: IdentifyResultProps) => {
    const [featureInfo, setFeatureInfo] = useState<FeatureInfo>();
    const [featureItem, setFeatureItem] = useState<FeatureItem>();
    const [loading, setLoading] = useState(false);

    const isNotFound = identifyInfo && identifyInfo.response.featureCount === 0;

    useEffect(() => {
        if (isNotFound) {
            setFeatureInfo(undefined);
            setFeatureItem(undefined);
        }
    }, [isNotFound]);

    const updateFeatureItem = (featureInfo: FeatureInfo) => {
        setFeatureItem(undefined);
        setLoading(true);
        loadFeatureItem(identifyInfo, featureInfo)
            .then((featureItemLoaded) => {
                setFeatureItem(featureItemLoaded);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const onFeatureChange = (featureInfo: FeatureInfo) => {
        setFeatureInfo(featureInfo);
        updateFeatureItem(featureInfo);
    };

    const featuresInfoList = useMemo(() => {
        const options = identifyInfoToFeaturesInfo(identifyInfo, display);
        if (options.length) {
            const first = options[0];
            onFeatureChange(first);
        }
        return options;
    }, [identifyInfo, display]);

    if (!identifyInfo) {
        return null;
    }

    let loadElement = null;
    if (loading) {
        loadElement = (
            <div className="load-row">
                <div className="load">
                    <div>{msgLoad}</div>
                </div>
            </div>
        );
    }

    const coordinatesPanel = (
        <div className="panel-content-container margin-all">
            <div className="fill">
                <CoordinatesSwitcher
                    display={display}
                    identifyInfo={identifyInfo}
                />
            </div>
        </div>
    );

    let noFoundElement = null;
    if (isNotFound) {
        noFoundElement = (
            <div className="panel-content-container no-margin-x">
                <div className="fill">
                    <Alert
                        message={msgNotFound}
                        type="warning"
                        banner
                        showIcon
                    />
                </div>
            </div>
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
            <FeatureInfo
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
};

export const IdentificationPanel = ({
    display,
    identifyInfo,
    title,
    close,
}: IdentificationPanelProps) => {
    let info;
    if (!identifyInfo) {
        info = (
            <Alert
                className="alert"
                message={msgTipTitle}
                description={msgTipIdent}
                showIcon={false}
                type="info"
                banner
            />
        );
    }

    return (
        <div className="ngw-panel ngw-webmap-identify-panel">
            <PanelHeader {...{ title, close }} />
            {info}
            <IdentifyResult identifyInfo={identifyInfo} display={display} />
        </div>
    );
};
