import { useEffect, useState } from "react";

import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";

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
