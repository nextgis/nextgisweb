import { useEffect, useMemo, useState } from "react";

import {
  Button,
  Form,
  Input,
  Space,
  Table,
  Tooltip,
} from "@nextgisweb/gui/antd";
import type { TableProps } from "@nextgisweb/gui/antd";
import { SearchIcon } from "@nextgisweb/gui/icon";
import { routeURL } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { SRSRead } from "@nextgisweb/spatial-ref-sys/type/api";

import InputOutlineIcon from "@nextgisweb/icon/material/input";

interface Query {
  q?: string;
}

interface SRSRow extends SRSRead {
  auth_name_srid: string | null;
}

interface CatalogBrowseProps {
  lockedCode?: string;
  onImportClick?: (catalogId: number) => void;
  scroll?: TableProps["scroll"];
}

export function CatalogBrowse({
  lockedCode,
  onImportClick,
  scroll,
}: CatalogBrowseProps) {
  const [search, setSearch] = useState(
    () =>
      lockedCode ?? new URLSearchParams(window.location.search).get("q") ?? ""
  );
  const [rows, setRows] = useState<SRSRow[]>([]);

  const query = useMemo(() => {
    const q: Query = {};
    if (search && search.length > 1) {
      q.q = search;
    }
    return q;
  }, [search]);

  const { data: srs, isLoading } = useRouteGet<SRSRead[]>({
    name: "spatial_ref_sys.catalog.collection",
    options: { query },
  });

  useEffect(() => {
    const newRows = srs
      ? srs.map((row) => ({
          auth_name_srid:
            (row.auth_name &&
              row.auth_srid &&
              `${row.auth_name}:${row.auth_srid}`) ||
            null,
          ...row,
        }))
      : [];

    setRows(
      lockedCode
        ? newRows.filter(
            (row) =>
              row.auth_name_srid?.toUpperCase() === lockedCode.toUpperCase()
          )
        : newRows
    );
  }, [srs, lockedCode]);

  const handleImport =
    onImportClick ??
    ((id: number) => window.open(routeURL("srs.catalog.import", id), "_self"));

  const columns: TableProps["columns"] = [
    {
      title: gettext("Display name"),
      dataIndex: "display_name",
      key: "display_name",
      sorter: (a, b) => (a.display_name > b.display_name ? 1 : -1),
    },
    {
      title: gettext("Authority and code"),
      dataIndex: "auth_name_srid",
      key: "auth_name_srid",
      sorter: (a, b) => (a.auth_name_srid > b.auth_name_srid ? 1 : -1),
    },
    {
      title: "",
      key: "action",
      width: 64,
      align: "center",
      render: (text, record) => (
        <div style={{ whiteSpace: "nowrap" }}>
          <Tooltip title={gettext("Import")}>
            <Button
              type="text"
              shape="circle"
              icon={<InputOutlineIcon />}
              onClick={() => handleImport(record.id)}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  const TableControl = () => (
    <Form layout="inline">
      <Form.Item>
        <Input
          placeholder={gettext("Search")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          prefix={<SearchIcon />}
          allowClear={!lockedCode}
          disabled={!!lockedCode}
        />
      </Form.Item>
    </Form>
  );

  return (
    <Space orientation="vertical" style={{ width: "100%" }}>
      {TableControl()}
      <Table
        rowKey="id"
        showSorterTooltip={false}
        loading={isLoading}
        columns={columns}
        dataSource={rows}
        scroll={scroll}
      />
    </Space>
  );
}
