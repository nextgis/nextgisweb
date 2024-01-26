import { useEffect, useMemo, useState } from "react";

import { Table } from "@nextgisweb/gui/antd";
import type { TableProps } from "@nextgisweb/gui/antd";
import { utc } from "@nextgisweb/gui/dayjs";
import { SvgIconLink } from "@nextgisweb/gui/svg-icon";
import { sorterFactory } from "@nextgisweb/gui/util";
import { formatSize } from "@nextgisweb/gui/util/formatSize";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { MenuDropdown } from "./component/MenuDropdown";
import { RenderActions } from "./component/RednerActions";
import type { ChildrenResource as Resource } from "./type";

import "./ChildrenSection.less";

interface ChildrenSectionProps {
    data: Resource[];
    storageEnabled: boolean;
    resourceId: number;
}

const { Column } = Table;

export function ChildrenSection({
    data,
    resourceId,
    storageEnabled,
}: ChildrenSectionProps) {
    const [volumeVisible, setVolumeVisible] = useState(false);
    const [creationDateVisible, setCreationDateVisible] = useState(false);
    const [batchDeletingInProgress, setBatchDeletingInProgress] =
        useState(false);

    const [allowBatch, setAllowBatch] = useState(false);
    const [volumeValues, setVolumeValues] = useState<Record<number, number>>(
        {}
    );
    const [items, setItems] = useState<Resource[]>([...data]);
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
        <div className="ngw-resource-children-section">
            <Table
                dataSource={items}
                rowKey="id"
                size="middle"
                rowSelection={rowSelection}
            >
                <Column
                    title={gettext("Display name")}
                    className="displayName"
                    dataIndex="displayName"
                    sorter={sorterFactory("displayName")}
                    render={(value, record: Resource) => (
                        <SvgIconLink
                            href={record.link}
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
                        responsive={["xl"]}
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
                        sorter={(a: Resource, b: Resource) =>
                            volumeValues[a.id] - volumeValues[b.id]
                        }
                        render={(_, record: Resource) => {
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
                            data={data}
                            items={items}
                            selected={selected}
                            allowBatch={allowBatch}
                            resourceId={resourceId}
                            volumeVisible={volumeVisible}
                            storageEnabled={storageEnabled}
                            creationDateVisible={creationDateVisible}
                            setBatchDeletingInProgress={
                                setBatchDeletingInProgress
                            }
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
                    render={(actions, record: Resource) => (
                        <RenderActions
                            actions={actions}
                            id={record.id}
                            setTableItems={setItems}
                        />
                    )}
                />
            </Table>
        </div>
    );
}
