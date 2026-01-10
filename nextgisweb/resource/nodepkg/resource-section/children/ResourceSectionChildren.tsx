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
import { resources } from "@nextgisweb/resource/blueprint";
import { useResourceAttr } from "@nextgisweb/resource/hook/useResourceAttr";

import type { ResourceSectionProps } from "../type";

import { MenuDropdown } from "./component/MenuDropdown";
import { RenderActions } from "./component/RenderActions";
import type { ChildrenResource } from "./type";

import { LoadingOutlined } from "@ant-design/icons";

import "./ResourceSectionChildren.less";

const { Column } = Table;

const storageEnabled = pyramidSettings.storage.enabled;

interface ResourceSectionChildrenProps extends ResourceSectionProps {
    resourceChildren: ChildrenResource[];
}

export const ResourceSectionChildren = ({
    resourceId,
}: ResourceSectionChildrenProps) => {
    const [volumeVisible, setVolumeVisible] = useState(false);
    const [creationDateVisible, setCreationDateVisible] = useState(false);
    const [batchDeletingInProgress, setBatchDeletingInProgress] =
        useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [allowBatch, setAllowBatch] = useState(false);
    const [volumeValues, setVolumeValues] = useState<Record<number, number>>(
        {}
    );
    const [items, setItems] = useState<ChildrenResource[] | undefined>();
    const [selected, setSelected] = useState<number[]>([]);
    const { makeSignal } = useAbortController();
    const { fetchResourceAttr } = useResourceAttr();

    useEffect(() => {
        (async () => {
            setIsDataLoading(true);
            try {
                const items = await fetchResourceAttr({
                    resources: { "type": "search", "parent": resourceId },
                    attributes: [
                        ["resource.cls"],
                        ["resource.display_name"],
                        ["resource.owner_user"],
                    ],
                });

                const userNames = new Map<number, string | undefined>();

                for (const it of items) {
                    const userId = it[1][2];
                    if (userId !== undefined) {
                        userNames.set(userId.id, undefined);
                    }
                }
                const signal = makeSignal();
                await Promise.all(
                    userNames.keys().map(async (id) => {
                        const user = await route("auth.user.item", { id }).get({
                            cache: true,
                            signal,
                        });
                        userNames.set(id, user.display_name);
                    })
                );

                const childrens: ChildrenResource[] = [];
                for (const it of items) {
                    const [id, [cls, display_name, owner_user]] = it;

                    if (!cls || !display_name) continue;
                    const item: ChildrenResource = {
                        id,
                        cls,
                        displayName: display_name,
                        clsDisplayName: resources[cls]?.label,
                        ownerUserDisplayName:
                            owner_user !== undefined
                                ? userNames.get(owner_user.id)
                                : `#${owner_user}`,
                    };
                    childrens.push(item);
                }

                setItems(childrens);
            } finally {
                setIsDataLoading(false);
            }
        })();
    }, [fetchResourceAttr, makeSignal, resourceId]);

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
            {/* <Column
                title={
                    <MenuDropdown
                        data={[]}
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
                dataIndex="actions"
                render={(actions, record: ChildrenResource) => (
                    <RenderActions
                        actions={actions}
                        id={record.id}
                        setTableItems={setItems}
                    />
                )}
            /> */}
        </Table>
    );
};

ResourceSectionChildren.displayName = "ResourceSectionChildren";
