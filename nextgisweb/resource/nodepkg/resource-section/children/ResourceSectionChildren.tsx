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
import type { ResourceChildItem } from "@nextgisweb/resource/type/api";
import topic from "@nextgisweb/webmap/compat/topic";

import type { ResourceCompositeAddEvent } from "../main/CreateResourceButton";
import type { ResourceSectionProps } from "../type";

import { MenuDropdown } from "./component/MenuDropdown";
import { RenderActions } from "./component/RenderActions";

import "./ResourceSectionChildren.less";

const { Column } = Table;

const storageEnabled = pyramidSettings.storage_enabled;

interface ResourceSectionChildrenProps extends ResourceSectionProps {
    resourceChildren: ResourceChildItem[];
}

export const ResourceSectionChildren = ({
    resourceId,
    resourceChildren,
}: ResourceSectionChildrenProps) => {
    const [volumeVisible, setVolumeVisible] = useState(false);
    const [creationDateVisible, setCreationDateVisible] = useState(false);
    const [batchDeletingInProgress, setBatchDeletingInProgress] =
        useState(false);
    const { makeSignal } = useAbortController();
    const [allowBatch, setAllowBatch] = useState(false);
    const [volumeValues, setVolumeValues] = useState<Record<number, number>>(
        {}
    );
    const [items, setItems] = useState<ResourceChildItem[]>([
        ...resourceChildren,
    ]);

    const [selected, setSelected] = useState<number[]>([]);

    useEffect(() => {
        setSelected((oldSelection) => {
            const itemsIds = items.map((item) => item.id);
            const updatedSelection = oldSelection.filter((selectedItem) =>
                itemsIds.includes(selectedItem)
            );
            return updatedSelection;
        });
    }, [items]);

    useEffect(() => {
        const subscription = topic.subscribe(
            "resource/composite/add",
            async ({ id, cls }: ResourceCompositeAddEvent) => {
                setItems((old) => [
                    ...old,
                    {
                        id,
                        cls,
                        displayName: "...",
                        actions: [],
                    },
                ]);
                try {
                    const resp = await route("resource.children", {
                        id: resourceId,
                    }).get({
                        signal: makeSignal(),
                    });
                    const newChildren = resp.children.find(
                        (children) => children.id === id
                    );
                    if (newChildren) {
                        setItems((old) => {
                            const withoutLoaded = old.filter(
                                (item) => item.id !== id
                            );
                            return [...withoutLoaded, newChildren];
                        });
                    }
                } catch {
                    setItems((old) => {
                        return old.filter((item) => item.id !== id);
                    });
                }
            }
        );
        return () => {
            subscription.remove();
        };
    }, [items, makeSignal, resourceId]);

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
            dataSource={items}
            rowKey="id"
            rowSelection={rowSelection}
        >
            <Column
                title={gettext("Display name")}
                className="displayName"
                dataIndex="displayName"
                sorter={sorterFactory("displayName")}
                render={(value, record: ResourceChildItem) => (
                    <SvgIconLink
                        href={routeURL("resource.show", record.id)}
                        icon={`rescls-${record.cls}`}
                    >
                        {value}
                    </SvgIconLink>
                )}
            />
            <Column
                title={gettext("Type")}
                responsive={["md"]}
                className="cls"
                dataIndex="clsDisplayName"
                sorter={sorterFactory("clsDisplayName")}
            />
            <Column
                title={gettext("Owner")}
                responsive={["xl"]}
                className="ownerUser"
                dataIndex="ownerUserDisplayName"
                sorter={sorterFactory("ownerUserDisplayName")}
            />
            {creationDateVisible && (
                <Column
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
                <Column
                    title={gettext("Volume")}
                    className="volume"
                    sorter={(a: ResourceChildItem, b: ResourceChildItem) =>
                        volumeValues[a.id] - volumeValues[b.id]
                    }
                    render={(_, record: ResourceChildItem) => {
                        if (volumeValues[record.id] !== undefined) {
                            return formatSize(volumeValues[record.id]);
                        } else {
                            return "";
                        }
                    }}
                />
            )}
            <Column
                title={
                    <MenuDropdown
                        data={resourceChildren}
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
                render={(actions, record: ResourceChildItem) => (
                    <RenderActions
                        actions={actions}
                        id={record.id}
                        setTableItems={setItems}
                    />
                )}
            />
        </Table>
    );
};

ResourceSectionChildren.displayName = "ResourceSectionChildren";
