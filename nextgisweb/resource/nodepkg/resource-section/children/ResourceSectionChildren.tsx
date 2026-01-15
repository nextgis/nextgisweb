import { useEffect, useMemo, useState } from "react";

import { Table } from "@nextgisweb/gui/antd";
import type { TableProps } from "@nextgisweb/gui/antd";
import { utc } from "@nextgisweb/gui/dayjs";
import { SvgIconLink } from "@nextgisweb/gui/svg-icon";
import { sorterFactory } from "@nextgisweb/gui/util";
import { formatSize } from "@nextgisweb/gui/util/formatSize";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import pyramidSettings from "@nextgisweb/pyramid/client-settings";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceAttrItem } from "@nextgisweb/resource/api/ResourceAttrItem";
import type { Attributes } from "@nextgisweb/resource/api/resource-attr";
import { resources } from "@nextgisweb/resource/blueprint";
import { useResourceAttr } from "@nextgisweb/resource/hook/useResourceAttr";

import type { ResourceSectionProps } from "../type";

import { MenuDropdown } from "./component/MenuDropdown";
import { RenderActions } from "./component/RenderActions";
import { registry } from "./registry";
import type { ChildrenResource } from "./type";

import { LoadingOutlined } from "@ant-design/icons";

import "./ResourceSectionChildren.less";

const { Column } = Table;

export const DefaultAttributes = [
    ["resource.cls"],
    ["resource.display_name"],
    ["resource.owner_user"],
] as const satisfies Attributes;

const storageEnabled = pyramidSettings.storage.enabled;

export const ResourceSectionChildren = ({
    resourceId,
}: ResourceSectionProps) => {
    const [volumeVisible, setVolumeVisible] = useState(false);
    const [creationDateVisible, setCreationDateVisible] = useState(false);
    const [batchDeletingInProgress, setBatchDeletingInProgress] =
        useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [allowBatch, setAllowBatch] = useState(false);
    const [volumeValues, setVolumeValues] = useState<Record<number, number>>(
        {}
    );
    const [items, setItems] = useState<ChildrenResource[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const { makeSignal } = useAbortController();
    const { fetchResourceItems } = useResourceAttr();

    useEffect(() => {
        (async () => {
            setIsDataLoading(true);
            try {
                const reg = registry.queryAll();

                const attrs: [...Attributes] = [];
                for (const { attributes } of reg) {
                    if (attributes) {
                        attrs.push(...attributes);
                    }
                }

                const items = await fetchResourceItems({
                    resources: { "type": "search", "parent": resourceId },
                    attributes: [...DefaultAttributes, ...attrs],
                });

                const userNames = new Map<number, string | undefined>();

                for (const it of items) {
                    const userId = it.get("resource.owner_user");
                    if (userId !== undefined) {
                        userNames.set(userId.id, undefined);
                    }
                }
                const signal = makeSignal();
                await Promise.all(
                    userNames.keys().map(async (id) => {
                        const user = await route("auth.user.item", { id }).get({
                            cache: true,
                            query: { brief: true },
                            signal,
                        });
                        userNames.set(id, user.display_name);
                    })
                );

                const childrens: ChildrenResource[] = [];
                for (const it of items) {
                    const cls = it.get("resource.cls");
                    const displayName = it.get("resource.display_name");
                    const ownerUser = it.get("resource.owner_user");

                    if (!cls || !displayName) continue;
                    const item: ChildrenResource = {
                        id: it.id,
                        cls,
                        displayName,
                        clsDisplayName: resources[cls]?.label,
                        ownerUserDisplayName:
                            ownerUser !== undefined
                                ? userNames.get(ownerUser.id)
                                : `#${ownerUser}`,
                        it: it as ResourceAttrItem<typeof DefaultAttributes>,
                    };
                    childrens.push(item);
                }
                setItems(childrens);
            } finally {
                setIsDataLoading(false);
            }
        })();
    }, [fetchResourceItems, makeSignal, resourceId]);

    useEffect(() => {
        if (items !== undefined) {
            setSelected((oldSelection) => {
                const itemsIds = items.map((item) => item.id);
                const updatedSelection = oldSelection.filter((selectedItem) =>
                    itemsIds.includes(selectedItem)
                );
                return updatedSelection;
            });
        }
    }, [items]);

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

    return (
        <Table
            className="ngw-resource-resource-section-children"
            size="middle"
            card={true}
            loading={{
                spinning: isDataLoading,
                indicator: <LoadingOutlined />,
            }}
            dataSource={items}
            rowKey="id"
            rowSelection={rowSelection}
        >
            <Column<ChildrenResource>
                title={gettext("Display name")}
                className="displayName"
                dataIndex="displayName"
                sorter={sorterFactory("displayName")}
                render={(value, record) => (
                    <SvgIconLink
                        href={routeURL("resource.show", record.id)}
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
                    sorter={(a, b) => volumeValues[a.id] - volumeValues[b.id]}
                    render={(_, record) => {
                        if (volumeValues[record.id] !== undefined) {
                            return formatSize(volumeValues[record.id]);
                        } else {
                            return "";
                        }
                    }}
                />
            )}
            <Column<ChildrenResource>
                title={
                    <MenuDropdown
                        items={items}
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
                        setSelected={setSelected}
                        setItems={setItems}
                    />
                }
                className="actions"
                render={(_, record) => (
                    <RenderActions record={record} setTableItems={setItems} />
                )}
            />
        </Table>
    );
};

ResourceSectionChildren.displayName = "ResourceSectionChildren";
