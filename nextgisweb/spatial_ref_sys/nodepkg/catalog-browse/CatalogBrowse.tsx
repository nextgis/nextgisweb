import { useEffect, useMemo, useState } from "react";

import {
    Button,
    Divider,
    Form,
    Input,
    InputNumber,
    Space,
    Table,
    Tooltip,
} from "@nextgisweb/gui/antd";
import type { TableProps } from "@nextgisweb/gui/antd";
import { routeURL } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!spatial_ref_sys";

import type { SRSItem } from "../type";

import InputOutlineIcon from "@nextgisweb/icon/material/input";
import OpenInNewIcon from "@nextgisweb/icon/material/open_in_new";
import SearchIcon from "@nextgisweb/icon/material/search";

interface Query {
    q?: string;
    lat?: number;
    lon?: number;
}

interface SRSRow extends SRSItem {
    auth_name_srid: string | null;
}

export function CatalogBrowse() {
    const [search, setSearch] = useState("");
    const [lon, setLon] = useState<number | null>(null);
    const [lat, setLat] = useState<number | null>(null);

    const [rows, setRows] = useState<SRSRow[]>([]);

    const latLon = useMemo(
        () => (lon !== null && lat !== null ? [lat, lon] : null),
        [lat, lon]
    );

    const query = useMemo(() => {
        const q: Query = {};
        if ((search && search.length > 1) || latLon) {
            if (search) {
                q.q = search;
            }
            if (latLon) {
                q.lat = latLon[0];
                q.lon = latLon[1];
            }
            return q;
        }
        return q;
    }, [search, latLon]);

    const { data: srs, isLoading } = useRouteGet<SRSItem[]>({
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

        setRows(newRows);
    }, [srs]);

    const onImportClick = (id: number) => {
        const url = routeURL("srs.catalog.import", id);
        window.open(url, "_self");
    };

    const columns: TableProps["columns"] = [
        {
            title: gettext("Display name"),
            dataIndex: "display_name",
            key: "display_name",
            sorter: (a, b) => (a.display_name > b.display_name ? 1 : -1),
            render: (text, record) => (
                <>
                    {text}{" "}
                    <Tooltip title={gettext("Show in catalog")}>
                        <a
                            href={settings.catalog.url + "/srs/" + record.id}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <OpenInNewIcon />
                        </a>
                    </Tooltip>
                </>
            ),
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
            width: "0px",
            align: "center",
            render: (text, record) => (
                <div style={{ whiteSpace: "nowrap" }}>
                    <Tooltip title={gettext("Import")}>
                        <Button
                            type="text"
                            shape="circle"
                            icon={<InputOutlineIcon />}
                            onClick={() => onImportClick(record.id)}
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
                    allowClear
                />
            </Form.Item>
            {settings.catalog.coordinates_search ? (
                <>
                    <Form.Item style={{ height: "100%" }}>
                        <Divider type="vertical" />
                    </Form.Item>
                    <Form.Item>
                        <InputNumber
                            style={{ maxWidth: "10em" }}
                            placeholder={gettext("Latitude")}
                            value={lat}
                            type="number"
                            onChange={(e) => {
                                setLat(e);
                            }}
                            addonAfter="°"
                        />
                    </Form.Item>
                    <Form.Item>
                        <InputNumber
                            style={{ maxWidth: "10em" }}
                            placeholder={gettext("Longitude")}
                            value={lon}
                            type="number"
                            onChange={(e) => {
                                setLon(e);
                            }}
                            addonAfter="°"
                        />
                    </Form.Item>
                </>
            ) : null}
        </Form>
    );

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            {TableControl()}
            <Table
                rowKey="id"
                showSorterTooltip={false}
                loading={isLoading}
                columns={columns}
                dataSource={rows}
            />
        </Space>
    );
}
