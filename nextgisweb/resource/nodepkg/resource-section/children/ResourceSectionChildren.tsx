import { useEffect, useMemo, useState } from "react";

import { Table } from "@nextgisweb/gui/antd";
import type { TableProps } from "@nextgisweb/gui/antd";
import { utc } from "@nextgisweb/gui/dayjs";
import { SvgIconLink } from "@nextgisweb/gui/svg-icon";
import { sorterFactory } from "@nextgisweb/gui/util";
import { formatSize } from "@nextgisweb/gui/util/formatSize";
import { routeURL } from "@nextgisweb/pyramid/api";
import pyramidSettings from "@nextgisweb/pyramid/client-settings";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { Attributes } from "@nextgisweb/resource/api/resource-attr";
import { useResourceAttr } from "@nextgisweb/resource/hook/useResourceAttr";

import { registry } from "../registry";
import { DefaultResourceSectionAttrs } from "../type";
import type { DefaultResourceAttrItem, ResourceSectionProps } from "../type";

import { MenuDropdown } from "./component/MenuDropdown";
import { RenderActions } from "./component/RenderActions";
import type { ChildrenResource } from "./type";
import { prepareResourceChildren } from "./util/prepareResourceChildren";

import "./ResourceSectionChildren.less";

const { Column } = Table;

const storageEnabled = pyramidSettings.storage.enabled;

export function ResourceSectionChildren({ resourceId }: ResourceSectionProps) {
    const [volumeVisible, setVolumeVisible] = useState(false);
    const [creationDateVisible, setCreationDateVisible] = useState(false);
    const [batchDeletingInProgress, setBatchDeletingInProgress] =
        useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [allowBatch, setAllowBatch] = useState(false);
    const [volumeValues, setVolumeValues] = useState<Record<number, number>>(
        {}
    );
    const [dataSource, setDataSource] = useState<ChildrenResource[]>([]);
    const [attrItems, setAttrItems] = useState<DefaultResourceAttrItem[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const { makeSignal } = useAbortController();
    const { fetchResourceItems } = useResourceAttr();

    const attributes = useMemo(() => {
        const reg = registry.queryAll();

        const attrs: [...Attributes] = [];
        for (const { attributes } of reg) {
            if (attributes) {
                attrs.push(...attributes);
            }
        }
        return [...DefaultResourceSectionAttrs, ...attrs] as [
            ...typeof DefaultResourceSectionAttrs,
        ];
    }, []);

    useEffect(() => {
        (async () => {
            setIsDataLoading(true);
            try {
                const items = (await fetchResourceItems({
                    resources: { "type": "search", "parent": resourceId },
                    attributes,
                })) as DefaultResourceAttrItem[];

                setAttrItems(items);
            } finally {
                setIsDataLoading(false);
            }
        })();
    }, [fetchResourceItems, makeSignal, resourceId, attributes]);

    useEffect(() => {
        (async () => {
            try {
                //
                const children = await prepareResourceChildren({
                    attrItems,
                    signal: makeSignal(),
                });
                setDataSource(children);
            } finally {
                //
            }
        })();
    }, [attrItems, makeSignal]);

    useEffect(() => {
        if (dataSource !== undefined) {
            setSelected((oldSelection) => {
                const itemsIds = dataSource.map((item) => item.resourceId);
                const updatedSelection = oldSelection.filter((selectedItem) =>
                    itemsIds.includes(selectedItem)
                );
                return updatedSelection;
            });
        }
    }, [dataSource]);

    const rowSelection = useMemo<TableProps["rowSelection"] | undefined>(() => {
        return allowBatch
            ? {
                  type: "checkbox",
                  getCheckboxProps: () => ({
                      disabled: batchDeletingInProgress,
                  }),
                  selectedRowKeys: selected,
                  onChange: (selectedRowKeys) => {
                      setSelected(selectedRowKeys.map(Number));
                  },
              }
            : undefined;
    }, [allowBatch, selected, batchDeletingInProgress]);

    if (!dataSource.length) {
        return;
    }

    return (
        <Table
            className="ngw-resource-resource-section-children"
            size="middle"
            card={true}
            loading={isDataLoading}
            dataSource={dataSource}
            rowKey="resourceId"
            rowSelection={rowSelection}
        >
            <Column<ChildrenResource>
                title={gettext("Display name")}
                className="displayName"
                dataIndex="displayName"
                sorter={sorterFactory("displayName")}
                render={(value, record) => (
                    <SvgIconLink
                        href={routeURL("resource.show", record.resourceId)}
                        icon={`rescls-${record.cls}`}
                    >
                        {value}
                    </SvgIconLink>
                )}
            />
            <Column<ChildrenResource>
                title={gettext("Type")}
                responsive={["md"]}
                className="cls"
                dataIndex="clsDisplayName"
                sorter={sorterFactory("clsDisplayName")}
            />
            <Column<ChildrenResource>
                title={gettext("Owner")}
                responsive={["xl"]}
                className="ownerUser"
                dataIndex="ownerUserDisplayName"
                sorter={sorterFactory("ownerUserDisplayName")}
            />
            {creationDateVisible && (
                <Column<ChildrenResource>
                    title={gettext("Created")}
                    className="creationDate"
                    dataIndex="creationDate"
                    sorter={sorterFactory("creationDate")}
                    render={(text) => {
                        if (text && !text.startsWith("1970")) {
                            return (
                                <div style={{ whiteSpace: "nowrap" }}>
                                    {utc(text).local().format("L LTS")}
                                </div>
                            );
                        }
                        return "";
                    }}
                />
            )}
            {storageEnabled && volumeVisible && (
                <Column<ChildrenResource>
                    title={gettext("Volume")}
                    className="volume"
                    sorter={(a, b) =>
                        volumeValues[a.resourceId] - volumeValues[b.resourceId]
                    }
                    render={(_, record) => {
                        if (volumeValues[record.resourceId] !== undefined) {
                            return formatSize(volumeValues[record.resourceId]);
                        } else {
                            return "";
                        }
                    }}
                />
            )}
            <Column<ChildrenResource>
                title={
                    <MenuDropdown
                        items={dataSource}
                        selected={selected}
                        allowBatch={allowBatch}
                        resourceId={resourceId}
                        volumeVisible={volumeVisible}
                        storageEnabled={storageEnabled}
                        creationDateVisible={creationDateVisible}
                        setBatchDeletingInProgress={setBatchDeletingInProgress}
                        setCreationDateVisible={setCreationDateVisible}
                        setVolumeVisible={setVolumeVisible}
                        setVolumeValues={setVolumeValues}
                        setAllowBatch={setAllowBatch}
                        setAttrItems={setAttrItems}
                        setSelected={setSelected}
                    />
                }
                className="actions"
                render={(_, record) => (
                    <RenderActions
                        record={record}
                        attributes={attributes}
                        setAttrItems={setAttrItems}
                    />
                )}
            />
        </Table>
    );
}
