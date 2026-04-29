import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { Table } from "@nextgisweb/gui/antd";
import type { TableProps } from "@nextgisweb/gui/antd";
import { utc } from "@nextgisweb/gui/dayjs";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { resources } from "@nextgisweb/resource/blueprint";
import type { CompositeRead, ResourceCls } from "@nextgisweb/resource/type/api";

import { ResourceIcon } from "../../icon";

import type { ResourceSearchStore } from "./ResourceSearchStore";
import { DEFAULT_LIMIT } from "./types";

const msgName = gettext("Display name");
const msgType = gettext("Type");
const msgOwner = gettext("Owner");
const msgUpdated = gettext("Updated");

interface Row {
  key: number;
  id: number;
  display_name: string;
  cls: ResourceCls;
  owner: string;
  updated: string | null;
  source: CompositeRead;
}

const orderToSort = (
  order: string
): { field: string; direction: "ascend" | "descend" } | null => {
  if (!order) return null;
  let field = order;
  let direction: "ascend" | "descend" = "ascend";
  if (order.startsWith("-")) {
    field = order.slice(1);
    direction = "descend";
  } else if (order.startsWith("+")) {
    field = order.slice(1);
  }
  return { field, direction };
};

const sortToOrder = (
  field: string | undefined,
  direction: "ascend" | "descend" | undefined | null
): string => {
  if (!field || !direction) return "";
  return direction === "descend" ? `-${field}` : field;
};

export const ResultsTable = observer(function ResultsTable({
  store,
}: {
  store: ResourceSearchStore;
}) {
  const dataSource = useMemo<Row[]>(() => {
    return store.results.map((item) => {
      const r = item.resource!;
      const ownerId = r.owner_user?.id;
      const ownerName =
        ownerId !== null
          ? (store.usersById.get(ownerId)?.display_name ?? `#${ownerId}`)
          : "";
      return {
        key: r.id,
        id: r.id,
        display_name: r.display_name,
        cls: r.cls,
        owner: ownerName,
        updated: r.creation_date ?? null,
        source: item,
      };
    });
  }, [store.results, store.usersById]);

  const sort = orderToSort(store.order);
  const sortedInfo: { columnKey: string; order: "ascend" | "descend" } | null =
    sort ? { columnKey: sort.field, order: sort.direction } : null;

  const columns: TableProps<Row>["columns"] = [
    {
      title: msgName,
      key: "name",
      dataIndex: "display_name",
      sorter: true,
      sortOrder: sortedInfo?.columnKey === "name" ? sortedInfo.order : null,
      render: (_, row) => {
        const url = routeURL("resource.show", { id: row.id });
        const crumbs = store.breadcrumbs[row.id] ?? [];
        // Drop trailing entry (the resource itself).
        const path = crumbs.slice(0, -1);
        return (
          <div className="ngw-resource-search-name-cell">
            <a href={url} className="title">
              <ResourceIcon
                identity={row.cls}
                style={{ width: 16, height: 16, verticalAlign: "middle" }}
              />{" "}
              {row.display_name}
            </a>
            {path.length > 0 && (
              <div className="path">
                {path.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && " / "}
                    <a href={routeURL("resource.show", { id: p.id })}>
                      {p.display_name}
                    </a>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: msgType,
      key: "type",
      dataIndex: "cls",
      sorter: true,
      sortOrder: sortedInfo?.columnKey === "type" ? sortedInfo.order : null,
      render: (cls: ResourceCls) => resources[cls]?.label ?? cls,
    },
    {
      title: msgOwner,
      key: "owner",
      dataIndex: "owner",
      sorter: true,
      sortOrder: sortedInfo?.columnKey === "owner" ? sortedInfo.order : null,
    },
    {
      title: msgUpdated,
      key: "updated",
      dataIndex: "updated",
      sorter: true,
      sortOrder: sortedInfo?.columnKey === "updated" ? sortedInfo.order : null,
      render: (v: string | null) => (v ? utc(v).local().format("L LTS") : ""),
    },
  ];

  const onChange: TableProps<Row>["onChange"] = (
    pagination,
    _filters,
    sorter
  ) => {
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    const order = sortToOrder(single?.columnKey as string, single?.order);
    const limit = pagination.pageSize ?? DEFAULT_LIMIT;
    const current = pagination.current ?? 1;
    const offset = (current - 1) * limit;
    store.onTablePageOrSortChange(offset, limit, order);
  };

  const current = Math.floor(store.offset / store.limit) + 1;

  return (
    <Table<Row>
      dataSource={dataSource}
      columns={columns}
      loading={store.loading}
      onChange={onChange}
      pagination={{
        current,
        pageSize: store.limit,
        total: store.totalCount,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100"],
      }}
    />
  );
});
