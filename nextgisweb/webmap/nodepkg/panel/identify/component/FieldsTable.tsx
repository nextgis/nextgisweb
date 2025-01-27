import { useEffect, useState } from "react";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";

import { KeyValueTable } from "../KeyValueTable";
import { fieldValuesToDataSource, getFieldsInfo } from "../fields";
import type { FieldDataItem } from "../fields";
import type { FieldsTableProps } from "../identification";

export function FieldsTable({ featureInfo, featureItem }: FieldsTableProps) {
    const [fieldsInfo, setFieldsInfo] =
        useState<Map<string, FeatureLayerFieldRead>>();
    const [dataSource, setDataSource] = useState<FieldDataItem[]>();

    useEffect(() => {
        async function load() {
            const fields = await getFieldsInfo(featureInfo.layerId);
            setFieldsInfo(fields);
        }
        setDataSource(undefined);
        load();
    }, [featureInfo.layerId, featureItem]);

    useEffect(() => {
        if (!fieldsInfo) {
            return;
        }
        const abortController = new AbortController();
        const { fields } = featureItem;
        fieldValuesToDataSource(fields, fieldsInfo, {
            signal: abortController.signal,
        }).then((dataItems) => {
            setDataSource(dataItems);
        });
        return () => {
            if (abortController) {
                abortController.abort();
            }
        };
    }, [featureItem, fieldsInfo]);

    if (dataSource) {
        return <KeyValueTable data={dataSource} />;
    }

    return null;
}
