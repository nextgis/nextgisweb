import { useEffect, useMemo, useState } from "react";

import { Alert, Button, Table, Typography } from "@nextgisweb/gui/antd";
import type { TableProps } from "@nextgisweb/gui/antd";
import { utc } from "@nextgisweb/gui/dayjs";
import { isAbortError } from "@nextgisweb/gui/error";
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

import FeedbackIcon from "@nextgisweb/icon/material/feedback";
import LockPersonIcon from "@nextgisweb/icon/material/lock_person";

import "./ResourceSectionChildren.less";

/* prettier-ignore */ const
msgNoAccessTitle = gettext("No access to resources"),
msgNoAccessAuthDesc = gettext("You do not have permission to view resources here. Access may have been intentionally restricted or configured incorrectly. If you believe you should have access, please contact Web GIS administrator."),
msgNoAccessGuestDesc = gettext("You are not authorized. Sign in to check whether you have access to resources here, or contact Web GIS administrator for more information."),
msgContactAdministrator = gettext("Contact Web GIS administrator");

const { Column } = Table;
const { Paragraph } = Typography;

const storageEnabled = pyramidSettings.storage.enabled;

export function ResourceSectionChildren({
  resourceId,
  resourceData,
}: ResourceSectionProps) {
  const [volumeVisible, setVolumeVisible] = useState(false);
  const [creationDateVisible, setCreationDateVisible] = useState(false);
  const [batchDeletingInProgress, setBatchDeletingInProgress] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasVisible, setHasVisible] = useState(false);
  const [allowBatch, setAllowBatch] = useState(false);
  const [volumeValues, setVolumeValues] = useState<Record<number, number>>({});
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
          signal: makeSignal(),
        })) as DefaultResourceAttrItem[];

        setAttrItems(items);
        setHasVisible(!!items.length);
      } catch (err) {
        if (isAbortError(err)) {
          return;
        }
        setIsDataLoading(false);
        throw err;
      }
      setIsDataLoading(false);
    })();
  }, [fetchResourceItems, makeSignal, resourceId, attributes]);

  useEffect(() => {
    (async () => {
      const children = await prepareResourceChildren({
        attrItems,
        signal: makeSignal(),
      });
      setDataSource(children);
    })().catch((err) => {
      if (!isAbortError(err)) {
        throw err;
      }
    });
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

  const hasChildren = resourceData.resource.children;

  if (isDataLoading || (!hasVisible && !hasChildren && resourceId !== 0)) {
    return <></>;
  } else if (hasChildren && !hasVisible) {
    return (
      <Alert
        type="warning"
        icon={<LockPersonIcon />}
        showIcon={true}
        title={msgNoAccessTitle}
        description={
          <>
            <Paragraph>
              {ngwConfig.isGuest ? msgNoAccessGuestDesc : msgNoAccessAuthDesc}
            </Paragraph>
            {(!ngwConfig.isAdministrator || ngwConfig.isGuest) &&
              pyramidSettings.contactAdministratorUrl && (
                <Button
                  icon={<FeedbackIcon />}
                  href={pyramidSettings.contactAdministratorUrl}
                  target="_blank"
                >
                  {msgContactAdministrator}
                </Button>
              )}
          </>
        }
      />
    );
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
