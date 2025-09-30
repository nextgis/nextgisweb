import { useEffect, useState } from "react";

import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";

import { KeyValueTable } from "../KeyValueTable";
import { fieldValuesToDataSource, getFieldsInfo } from "../fields";
import type { FieldDataItem } from "../fields";

export interface FieldsTableProps {
    resourceId: number;
    featureItem: FeatureItem;
}

export function FieldsTable({ featureItem, resourceId }: FieldsTableProps) {
    const [fieldsInfo, setFieldsInfo] =
        useState<Map<string, FeatureLayerFieldRead>>();
    const [dataSource, setDataSource] = useState<FieldDataItem[]>();

    const { makeSignal } = useAbortController();

    useEffect(() => {
        async function load() {
            const fields = await getFieldsInfo(resourceId);
            setFieldsInfo(fields);
        }
        setDataSource(undefined);
        load();
    }, [resourceId, featureItem]);

    useEffect(() => {
        if (!fieldsInfo) {
            return;
        }

        const { fields } = featureItem;
        fieldValuesToDataSource(fields, fieldsInfo, {
            signal: makeSignal(),
        }).then((dataItems) => {
            setDataSource(dataItems);
        });
    }, [featureItem, makeSignal, fieldsInfo]);

    if (dataSource) {
        return <KeyValueTable data={dataSource} />;
    }

    return null;
}
