import { useState, useEffect } from "react";
import { ReloadOutlined } from "@ant-design/icons";
import { route } from "@nextgisweb/pyramid/api";
import { Button, Col, Row, Skeleton, Table, Typography } from "@nextgisweb/gui/antd";
import { utc } from "@nextgisweb/gui/dayjs";
import i18n from "@nextgisweb/pyramid/i18n!";
import settings from "@nextgisweb/pyramid/settings!";
import kindOfData from "@nextgisweb/pyramid/api/load!/api/component/pyramid/kind_of_data";
import "./StorageSummary.css";

function formatSize(value) {
    return (value / 1024 ** 2).toFixed(0).toString();
}

async function sleep(msec) {
    await new Promise((resolve) => setTimeout(resolve, msec));
}

export function StorageSummary() {
    const [skeleton, setSkeleton] = useState(true);
    const [isEstimating, setIsEstimating] = useState(false);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState({});

    async function load(waitForEstimation) {
        waitForEstimation && (await sleep(5000));

        while (true) {
            const newIsEstimating = (await route("pyramid.storage_status")
                .get().estimation_running) === true;
            setIsEstimating(newIsEstimating);
            if (!waitForEstimation || !newIsEstimating) break;
        }

        const data = await route("pyramid.storage").get();
        const newRows = [];
        for (const [k, v] of Object.entries(data)) {
            if (k !== "") {
                newRows.push({
                    kind_of_data: k,
                    data_volume: v.data_volume,
                });
            } else {
                setTotal({
                    data_volume: v.data_volume,
                    esimated: v.estimated,
                    updated: v.updated,
                });
            }
        }
        setRows(newRows);

        setSkeleton(false);
    }

    async function doEstimate() {
        setIsEstimating(true);
        await route("pyramid.estimate_storage").post();
        await load(true);
    }

    useEffect(() => load(false), []);

    if (skeleton) {
        return <Skeleton paragraph={{ rows: 8 }} />;
    }

    function renderDataVolumeCell(v) {
        const percent = ((100 * v) / total.data_volume).toFixed(0);
        return (
            <>
                <span>{formatSize(v)} MiB</span>
                <div className="wrapper">
                    <div className="bar" style={{width: `${percent}%`}}></div>
                </div>
            </>
        );
    }

    const columns = [
        {
            title: i18n.gettext("Kind of data"),
            dataIndex: "kind_of_data",
            render: (v) => kindOfData[v],
            sorter: (a, b) => (a.kind_of_data > b.kind_of_data ? 1 : -1),
        },
        {
            title: i18n.gettext("Volume"),
            dataIndex: "data_volume",
            className: "data-volume",
            render: renderDataVolumeCell,
            sorter: (a, b) => a.data_volume - b.data_volume,
            defaultSortOrder: "descend",
        },
    ];

    function renderSummary() {
        const Summary = Table.Summary;
        const { Row, Cell } = Summary;
        const limit = settings.storage_limit;
        return (
            <Summary fixed>
                <Row>
                    <Cell>{i18n.gettext("Total")}</Cell>
                    <Cell align="right">
                        {formatSize(total.data_volume || 0)}
                        {(limit && (
                            <>
                                {" " + i18n.gettext("of") + " "}
                                {formatSize(limit) + " MiB"} (
                                {(100 * total.data_volume / limit)
                                    .toFixed(0).toString() + " %"}
                                )
                            </>
                        )) || " MiB"}
                    </Cell>
                </Row>
            </Summary>
        );
    }

    function infoTextFirst() {
        if (total.esimated != null && total.updated != null) {
            return i18n.gettext("Storage usage was fully estimated at %s and total.updated at %s.")
                .replace("%s", utc(total.esimated).local().format("L LTS"))
                .replace("%s", utc(total.updated).local().format("L LTS"));
        } else if (total.updated == null) {
            return i18n.gettext("Storage usage was fully estimated at %s.")
                .replace("%s", utc(total.esimated).local().format("L LTS"));
        } else if (total.estimated == null) {
            return i18n.gettext("Storage usage hasn't been estimated yet but was updated at %s.")
                .replace("%s", utc(total.updated).local().format("L LTS"));
        } else {
            return i18n.gettext("Storage usage hasn't been estimated yet.");
        }
    }

    function infoTextSecond() {
        return i18n.gettext("Some changes may be reflected only after full estimation.");
    }

    return (
        <>
            <Table
                rowKey="kind_of_data"
                columns={columns}
                dataSource={rows}
                className="pyramid-storage-summary"
                pagination={false}
                size="middle"
                summary={renderSummary}
            />

            <Row wrap={false} style={{ marginTop: "2em" }}>
                <Col flex="none" style={{ marginRight: "1em" }}>
                    <Button
                        onClick={isEstimating || doEstimate}
                        loading={isEstimating}
                        icon={<ReloadOutlined />}
                        size="large"
                    >
                        {i18n.gettext("Estimate storage")}
                    </Button>
                </Col>
                <Col flex="auto">
                    <Typography.Paragraph>
                        {infoTextFirst()}<br />
                        {infoTextSecond()}
                    </Typography.Paragraph>
                </Col>
            </Row>
        </>
    );
}
