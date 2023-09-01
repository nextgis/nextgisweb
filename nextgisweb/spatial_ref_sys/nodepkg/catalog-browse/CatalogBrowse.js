import debounce from "lodash-es/debounce";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!spatial_ref_sys";

import InputOutlineIcon from "@nextgisweb/icon/material/input";
import OpenInNewIcon from "@nextgisweb/icon/material/open_in_new";
import SearchIcon from "@nextgisweb/icon/material/search";

export function CatalogBrowse() {
    const [status, setStatus] = useState(null);
    const [search, setSearch] = useState("");
    const [lon, setLon] = useState(null);
    const [lat, setLat] = useState(null);

    const [rows, setRows] = useState([]);

    const latLon = useMemo(
        () => (lon !== null && lat !== null ? [lat, lon] : null),
        [lat, lon]
    );

    const query = useMemo(() => {
        if ((search && search.length > 1) || latLon) {
            const q = {};
            if (search) {
                q.q = search;
            }
            if (latLon) {
                q.lat = latLon[0];
                q.lon = latLon[1];
            }
            return q;
        }
        return null;
    }, [search, latLon]);

    const makeRequest = useCallback(
        debounce(async ({ query: q, signal }) => {
            setStatus("loading");
            try {
                const srs = await route(
                    "spatial_ref_sys.catalog.collection"
                ).get({
                    query: q,
                    signal,
                });
                setRows(
                    // Add auth_name_srid column
                    srs.map((row) => ({
                        auth_name_srid:
                            (row.auth_name &&
                                row.auth_srid &&
                                `${row.auth_name}:${row.auth_srid}`) ||
                            null,
                        ...row,
                    }))
                );
            } catch (er) {
                // ignore error
            } finally {
                setStatus(null);
            }
        }, 1000)
    );

    useEffect(() => {
        let signal;
        let controller;
        if (query) {
            if (window.AbortController) {
                controller = new AbortController();
                signal = controller.signal;
            }
            makeRequest({ signal, query });
        } else {
            setRows([]);
        }
        return () => {
            if (controller) {
                controller.abort();
            }
        };
    }, [query]);

    const onImportClick = (id) => {
        const url = routeURL("srs.catalog.import", id);
        window.open(url, "_self");
    };

    const columns = [
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
                            allowClear
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
                            allowClear
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
                loading={status === "loading"}
                columns={columns}
                dataSource={rows}
            />
        </Space>
    );
}
