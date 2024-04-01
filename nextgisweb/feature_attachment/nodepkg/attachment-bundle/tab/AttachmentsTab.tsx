import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { fetchFeaturesItems } from "@nextgisweb/feature-layer/feature-grid/api/fetchFeatures";
import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import {
    Alert,
    Button,
    Divider,
    List,
    Space,
    Spin,
    Tag,
    Tooltip,
} from "@nextgisweb/gui/antd";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettext } from "@nextgisweb/pyramid/i18n";
import FilterExtentBtn from "@nextgisweb/webmap/filter-extent-btn";
import type { DojoDisplay, WebmapItemConfig } from "@nextgisweb/webmap/type";

import type { FeatureAttachment } from "../../type";
import { fileSizeToString } from "../../utils";

import {
    DownloadOutlined,
    ExpandOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";

import "./AttachmentsTab.less";

const tipLabel = gettext(
    "Draw the geometry on the map to visualize the attachments to the objects"
);

interface AttachmentsTabProps {
    display: DojoDisplay;
    label: string;
}

interface FeatureAttachmentView {
    featureId: number;
    attachment: FeatureAttachment;
    label?: string;
}

interface LayerItemView {
    layerLabel: string;
    layerId: number;
    attachments: FeatureAttachmentView[];
}

type IdentifyFeatureFunc = (featureId: number, layerId: number) => void;

const getLayersInfo = (display: DojoDisplay) => {
    const checked = display.webmapStore.checked;
    const itemConfig = display.getItemConfig();

    const layersResourceIds = new Map<number, WebmapItemConfig>();
    checked.forEach((itemId) => {
        const itemInfo = itemConfig[itemId];
        if (
            itemInfo &&
            itemInfo.plugin &&
            "ngw-webmap/plugin/FeatureLayer" in itemInfo.plugin
        ) {
            layersResourceIds.set(itemInfo.layerId, itemInfo);
        }
    });

    return layersResourceIds;
};

interface AttachmentsListDataItem {
    id: number;
    size: string;
    name: string;
    description: string | undefined;
    featureId: number;
    layerId: number;
    label?: string;
}

const attachmentsToDataList = (
    layerItemView: LayerItemView
): AttachmentsListDataItem[] => {
    const layerId = layerItemView.layerId;
    return layerItemView.attachments.map((l: FeatureAttachmentView) => ({
        id: l.attachment.id,
        size: fileSizeToString(l.attachment.size),
        name: l.attachment.name,
        description: l.attachment.description,
        featureId: l.featureId,
        layerId,
        label: l.label,
    }));
};

const makeListItem = (
    item: AttachmentsListDataItem,
    layerId: number,
    identifyFeature: IdentifyFeatureFunc
) => {
    const href = routeURL("feature_attachment.download", {
        id: layerId,
        fid: item.featureId,
        aid: item.id,
    });

    const label = item.label || `#${item.featureId}`;

    return (
        <List.Item key={item.id}>
            <div className="attachment">
                <div className="row" title={item.name}>
                    <div className="name">{item.name}</div>
                    <div>
                        <Button
                            shape="circle"
                            type="text"
                            target="_blank"
                            href={href}
                            title={`${gettext("Download")} ${item.size}`}
                        >
                            <DownloadOutlined />
                        </Button>
                    </div>
                </div>
                <div className="row" title={gettext("Object: ") + label}>
                    <div className="name">{label}</div>
                    <div>
                        <Button
                            shape="circle"
                            type="text"
                            onClick={() =>
                                identifyFeature(item.featureId, item.layerId)
                            }
                            title={gettext("Identify object")}
                        >
                            <ExpandOutlined />
                        </Button>
                    </div>
                </div>
            </div>
        </List.Item>
    );
};

const makeAttachmentsList = (
    layerItemView: LayerItemView,
    identifyFeature: IdentifyFeatureFunc
): ReactElement => {
    const data = attachmentsToDataList(layerItemView);
    let header;
    if (data.length) {
        header = (
            <div>
                <Tag>
                    {gettext("Attachments: ")}
                    {data.length}
                </Tag>
            </div>
        );
    }

    return (
        <div className="attachments-list" key={layerItemView.layerLabel}>
            <Divider orientation="left">{layerItemView.layerLabel}</Divider>
            <List
                size="small"
                bordered
                dataSource={data}
                header={header}
                grid={{
                    gutter: 16,
                    xs: 1,
                    sm: 2,
                    md: 3,
                    lg: 4,
                    xl: 4,
                    xxl: 4,
                }}
                renderItem={(item) =>
                    makeListItem(item, layerItemView.layerId, identifyFeature)
                }
                locale={{ emptyText: gettext("No attachments") }}
            />
        </div>
    );
};

const layerItems = (
    layerAttachments: LayerItemView[] | undefined,
    display: DojoDisplay
) => {
    if (!layerAttachments) {
        return undefined;
    }

    const identifyFeature = (featureId: number, layerId: number) => {
        display.identify.identifyFeatureByAttrValue(layerId, "id", featureId);
    };

    return layerAttachments?.map((l) => {
        return makeAttachmentsList(l, identifyFeature);
    });
};

interface ButtonBulkLoadProps {
    layerAttachments: LayerItemView[];
}

const toBundleBody = (layerAttachments: LayerItemView[]) => {
    const items = layerAttachments
        .map((l) => {
            return l.attachments.map((a) => {
                return {
                    resource: l.layerId,
                    attachment: a.attachment.id,
                };
            });
        })
        .flat();

    return { items };
};

const ButtonBulkLoad = ({ layerAttachments }: ButtonBulkLoadProps) => {
    const [loading, setLoading] = useState(false);
    const download = async () => {
        setLoading(true);

        const blob: Blob = await route("feature_attachment.bundle").post({
            json: toBundleBody(layerAttachments),
            responseType: "blob",
        });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "feature-attachments.zip");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setLoading(false);
    };

    return (
        <Button loading={loading} onClick={download}>
            <DownloadOutlined />
            {gettext("Download all attachments")}
        </Button>
    );
};

const fetchFeaturesAttachments = async (
    display: DojoDisplay,
    signal: AbortSignal,
    geomWKT: string | undefined
): Promise<LayerItemView[]> => {
    if (!geomWKT) {
        return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promises: Promise<any[]>[] = [];
    const layersInfoById = getLayersInfo(display);

    Array.from(layersInfoById.keys()).forEach((resourceId) => {
        promises.push(
            fetchFeaturesItems({
                cache: false,
                resourceId,
                signal,
                intersects: geomWKT,
                fields: [],
                extensions: "attachment",
                label: true,
            })
        );
    });

    const parts = await Promise.all(promises);
    const layersInfo = Array.from(layersInfoById.values());
    const result: LayerItemView[] = [];

    parts.forEach((featuresInfo: FeatureItem[], index) => {
        const layerInfo = layersInfo[index];
        const attachments: FeatureAttachmentView[] = [];
        featuresInfo.forEach((f: FeatureItem) => {
            if (f.extensions && f.extensions.attachment) {
                const attachmentsInfo = f.extensions
                    .attachment as FeatureAttachment[];
                const attachmentsView: FeatureAttachmentView[] =
                    attachmentsInfo.map((a: FeatureAttachment) => ({
                        featureId: f.id,
                        attachment: a,
                        label: f.label,
                    }));
                attachments.push(...attachmentsView);
            }
        });
        result.push({
            layerLabel: layerInfo.label,
            layerId: layerInfo.layerId,
            attachments,
        });
    });

    return result;
};

function AttachmentsTab({ display }: AttachmentsTabProps) {
    const [loading, setLoading] = useState(false);
    const { makeSignal, abort } = useAbortController();
    const [geomWKT, setGeomWKT] = useState<string>();
    const [layerAttachments, setLayerAttachments] = useState<LayerItemView[]>();

    const loadFeatures = async () => {
        setLayerAttachments(undefined);
        setLoading(true);
        const signal = makeSignal();

        const layersAttachments = await fetchFeaturesAttachments(
            display,
            signal,
            geomWKT
        );

        setLayerAttachments(layersAttachments);
        setLoading(false);
    };

    useEffect(() => {
        abort();
        if (geomWKT) {
            loadFeatures();
        } else {
            setLayerAttachments(undefined);
        }
    }, [geomWKT]);

    const listAttachments = useMemo(
        () => layerItems(layerAttachments, display),
        [layerAttachments, display]
    );

    let content, buttonBulkLoad;
    if (layerAttachments) {
        content = listAttachments;
        buttonBulkLoad = (
            <Space.Compact>
                <ButtonBulkLoad layerAttachments={layerAttachments} />
            </Space.Compact>
        );
    } else if (loading) {
        content = (
            <div className="loading">
                <Spin />
            </div>
        );
    } else {
        content = <Alert message={tipLabel} type="info" />;
    }

    return (
        <div className="attachments-tab">
            <div className="header">
                <Space.Compact>
                    <FilterExtentBtn
                        id="attachments"
                        display={display}
                        onGeomChange={(geom, geomWKT) => {
                            setGeomWKT(geomWKT);
                        }}
                    />
                </Space.Compact>

                {buttonBulkLoad}

                <Space.Compact className="right">
                    <Tooltip title={tipLabel}>
                        <InfoCircleOutlined />
                    </Tooltip>
                </Space.Compact>
            </div>
            <div className="content">{content}</div>
        </div>
    );
}

export default AttachmentsTab;
