import { observer } from "mobx-react-lite";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { Spin, Table } from "@nextgisweb/gui/antd";
import type { TableProps } from "@nextgisweb/gui/antd";
import { utc } from "@nextgisweb/gui/dayjs";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { resources } from "@nextgisweb/resource/blueprint";
import type { CompositeRead, ResourceCls } from "@nextgisweb/resource/type/api";

import { ResourceIcon } from "../../icon";

import type { ResourceSearchStore } from "./ResourceSearchStore";

const msgName = gettext("Display name");
const msgType = gettext("Type");
const msgOwner = gettext("Owner");
const msgCreated = gettext("Created");
const msgLoadingMore = gettext("Loading more results...");

const MIN_RESULTS_HEIGHT = 500;
const TABLE_HEADER_HEIGHT = 56;
const MIN_SCROLL_Y = MIN_RESULTS_HEIGHT - TABLE_HEADER_HEIGHT;
const VIEWPORT_BOTTOM_GAP = 16;

function getContainerHeight(element: HTMLDivElement | null): number {
  if (!element) return MIN_RESULTS_HEIGHT;
  const { top } = element.getBoundingClientRect();
  return Math.max(
    window.innerHeight - top - VIEWPORT_BOTTOM_GAP,
    MIN_RESULTS_HEIGHT
  );
}

interface Row {
  key: number;
  id: number;
  display_name: string;
  cls: ResourceCls;
  owner: string;
  creationDate: string | null;
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState(MIN_RESULTS_HEIGHT);
  const [scrollY, setScrollY] = useState(MIN_SCROLL_Y);

  useLayoutEffect(() => {
    const updateHeight = () => {
      const nextContainerHeight = getContainerHeight(containerRef.current);
      const nextScrollY = Math.max(
        nextContainerHeight - TABLE_HEADER_HEIGHT,
        MIN_SCROLL_Y
      );

      setContainerHeight((prev) =>
        prev === nextContainerHeight ? prev : nextContainerHeight
      );
      setScrollY((prev) => (prev === nextScrollY ? prev : nextScrollY));
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    const parentElement = containerRef.current?.parentElement;
    if (parentElement) {
      observer.observe(parentElement);
    }

    window.addEventListener("resize", updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [store.settingsVisible, store.metaFilters.length, store.error]);

  const dataSource = useMemo<Row[]>(() => {
    return store.results.map((item) => {
      const r = item.resource!;
      const ownerId = r.owner_user?.id;
      const ownerName =
        ownerId !== undefined && ownerId !== null
          ? (store.usersById.get(ownerId)?.display_name ?? `#${ownerId}`)
          : "";

      return {
        key: r.id,
        id: r.id,
        display_name: r.display_name,
        cls: r.cls,
        owner: ownerName,
        creationDate: r.creation_date ?? null,
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
      title: msgCreated,
      key: "created",
      dataIndex: "creationDate",
      sorter: true,
      sortOrder: sortedInfo?.columnKey === "created" ? sortedInfo.order : null,
      render: (v: string | null) => (v ? utc(v).local().format("L LTS") : ""),
    },
  ];

  const onChange: TableProps<Row>["onChange"] = (
    _pagination,
    _filters,
    sorter
  ) => {
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    const order = sortToOrder(single?.columnKey as string, single?.order);
    store.onTableSortChange(order);
  };

  const onScroll: TableProps<Row>["onScroll"] = (event) => {
    const target = event.currentTarget;
    const remaining =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    if (remaining < 200) {
      void store.loadMore();
    }
  };

  return (
    <div
      ref={containerRef}
      className="ngw-resource-search-results-table"
      style={{ height: containerHeight }}
    >
      <Table<Row>
        dataSource={dataSource}
        rowKey="id"
        columns={columns}
        loading={store.loading}
        virtual
        onChange={onChange}
        onScroll={onScroll}
        pagination={false}
        showSorterTooltip={false}
        scroll={{
          x: "max-content",
          y: scrollY,
          scrollToFirstRowOnChange: true,
        }}
        summary={() =>
          store.loadingMore ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={columns.length}>
                <div className="ngw-resource-search-results-loading-more">
                  <Spin size="small" /> {msgLoadingMore}
                </div>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          ) : null
        }
      />
    </div>
  );
});
