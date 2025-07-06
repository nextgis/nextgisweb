import type { Dayjs } from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Skeleton, Table } from "@nextgisweb/gui/antd";
import { utc } from "@nextgisweb/gui/dayjs";
import { sleep, sorterFactory } from "@nextgisweb/gui/util";
import { route } from "@nextgisweb/pyramid/api";
import settings from "@nextgisweb/pyramid/client-settings";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";
import { Translated } from "@nextgisweb/pyramid/i18n/translated";
import type {
    KindOfDataResponse,
    StorageValue,
} from "@nextgisweb/pyramid/type/api";

import CachedIcon from "@nextgisweb/icon/material/cached";

import "./StorageSummary.less";

const kindOfData = await route("pyramid.kind_of_data").get({ cache: true });

const [msgDelayed, msgEstF, msgEstFU, msgEstU, msgEstN] = [
    gettext("Some changes may be reflected only after full estimation."),
    gettextf("Storage usage was fully estimated at {f}."),
    gettextf("Storage usage was fully estimated at {f} and updated at {u}."),
    gettextf("Storage usage hasn't been estimated yet but was updated at {u}."),
    gettext("Storage usage hasn't been estimated yet."),
];

type KindOfDataIdentity = keyof KindOfDataResponse;

function formatSize(value: number) {
    return (value / (1 << 20)).toFixed(0).toString();
}

const sorterKod = sorterFactory("kind_of_data");
const sorterVol = sorterFactory("data_volume");

const renderUtc = (value: Dayjs) => {
    return (
        <strong style={{ whiteSpace: "nowrap" }}>
            {value.local().format("L LTS")}
        </strong>
    );
};

export function StorageSummary() {
    type RowData = { kind_of_data: KindOfDataIdentity; data_volume: number };
    type Data = [StorageValue, RowData[]];
    const [data, setData] = useState<Data | undefined>(undefined);
    const [isEstimating, setIsEstimating] = useState(false);

    const load = useCallback(async (waitForEstimation: boolean) => {
        if (waitForEstimation) {
            await sleep(5000);
        }

        while (true) {
            const resp = await route("pyramid.estimate_storage").get();
            const newIsEstimating = resp.active;
            setIsEstimating(newIsEstimating);
            if (!waitForEstimation || !newIsEstimating) break;
        }

        const data = await route("pyramid.storage").get();
        let newTotal: StorageValue;
        const newRows: RowData[] = [];
        for (const [k, v] of Object.entries(data)) {
            if (k !== "") {
                newRows.push({
                    kind_of_data: k as KindOfDataIdentity,
                    data_volume: v.data_volume,
                });
            } else {
                newTotal = v;
            }
        }
        setData([newTotal!, newRows]);
    }, []);

    const doEstimate = useCallback(() => {
        (async () => {
            setIsEstimating(true);
            // @ts-expect-error POST requests without body are unsupported
            await route("pyramid.estimate_storage").post();
            await load(true);
        })();
    }, [load]);

    useEffect(() => {
        load(false);
    }, [load]);

    const columns = useMemo(() => {
        const total = data?.[0];

        const renderDataVolumeCell = (v: number) => {
            if (!total) return;

            const percent = ((100 * v) / total.data_volume).toFixed(0);
            return (
                <>
                    <span>{formatSize(v)} MiB</span>
                    <div className="wrapper">
                        <div
                            className="bar"
                            style={{ width: `${percent}%` }}
                        ></div>
                    </div>
                </>
            );
        };

        return [
            {
                title: gettext("Kind of data"),
                dataIndex: "kind_of_data",
                render: (v: KindOfDataIdentity) => kindOfData[v],
                sorter: sorterKod,
            },
            {
                title: gettext("Volume"),
                dataIndex: "data_volume",
                className: "data-volume",
                defaultSortOrder: "descend" as const,
                render: renderDataVolumeCell,
                sorter: sorterVol,
            },
        ];
    }, [data]);

    const renderSummary = useCallback(() => {
        const total = data?.[0];
        if (!total) return;

        const Summary = Table.Summary;
        const { Row, Cell } = Summary;
        const limit = settings.storage_limit;
        return (
            <Summary fixed>
                <Row>
                    <Cell index={0}>{gettext("Total")}</Cell>
                    <Cell index={1} align="right">
                        {formatSize(total.data_volume || 0)}
                        {(limit && (
                            <>
                                {" " + gettext("of") + " "}
                                {formatSize(limit) + " MiB"} (
                                {((100 * total.data_volume) / limit)
                                    .toFixed(0)
                                    .toString() + " %"}
                                )
                            </>
                        )) ||
                            " MiB"}
                    </Cell>
                </Row>
            </Summary>
        );
    }, [data]);

    const msgInfo = useMemo(() => {
        const total = data?.[0];
        if (!total) return;

        let msgf;
        let args;

        if (total.estimated !== null && total.updated !== null) {
            msgf = msgEstFU;
            args = {
                f: renderUtc(utc(total.estimated)),
                u: renderUtc(utc(total.updated)),
            };
        } else if (total.updated === null) {
            msgf = msgEstF;
            args = { f: renderUtc(utc(total.estimated)) };
        } else if (total.estimated === null) {
            msgf = msgEstU;
            args = { u: renderUtc(utc(total.estimated)) };
        } else {
            return msgEstN + " " + msgDelayed;
        }
        return (
            <>
                <Translated msgf={msgf} args={args} /> {msgDelayed}
            </>
        );
    }, [data]);

    if (data === undefined) {
        return <Skeleton paragraph={{ rows: 8 }} />;
    }

    return (
        <div className="ngw-pyramid-storage-summary">
            <Table
                rowKey="kind_of_data"
                columns={columns}
                dataSource={data?.[1]}
                summary={renderSummary}
                size="middle"
                bordered={true}
            />
            <div className="panel">
                <Button
                    onClick={!isEstimating ? doEstimate : undefined}
                    loading={isEstimating}
                    icon={<CachedIcon />}
                    size="large"
                >
                    {gettext("Estimate storage")}
                </Button>
                <div className="text">{msgInfo}</div>
            </div>
        </div>
    );
}
