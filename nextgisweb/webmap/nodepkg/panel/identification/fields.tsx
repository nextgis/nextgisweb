import dayjs from "dayjs";

import type {
    FeatureLayerField,
    NgwAttributeType,
    NgwDate,
    NgwDateTime,
    NgwTime,
} from "@nextgisweb/feature-layer/type";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { load, lookup } from "./lookup";

const fieldsCache = new Map<number, any>();

export const getFieldsInfo = async (resourceId: number) => {
    if (resourceId in fieldsCache) {
        return fieldsCache.get(resourceId);
    }

    const resourceInfo = await route("resource.item", resourceId).get();
    const fieldmap = new Map();
    const promises: Promise<Record<string, string>>[] = [];
    resourceInfo.feature_layer.fields.forEach((fieldInfo: any) => {
        fieldmap.set(fieldInfo.keyname, fieldInfo);
        if (fieldInfo.lookup_table !== null) {
            promises.push(load(fieldInfo.lookup_table.id));
        }
    });
    fieldsCache.set(resourceId, fieldmap);
    await Promise.all(promises);

    return fieldsCache.get(resourceId);
};

const urlRegex =
    /^\s*(((((https?|ftp|file|e1c):\/\/))|(((mailto|tel):)))[\S]+)\s*$/i;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FieldDataItem {
    key: number;
    attr: string;
    value: string | React.ReactElement;
}

export const fieldValuesToDataSource = (
    fields: Record<string, NgwAttributeType>,
    fieldsInfo: Map<string, FeatureLayerField>
) => {
    let key = 0;
    const dataSource = [];

    for (const k in fields) {
        let val = fields[k];
        const field = fieldsInfo.get(k);
        if (!field) continue;

        if (val && field.datatype === "DATE") {
            const { year, month, day } = val as NgwDate;
            const dt = new Date(year, month - 1, day);
            val = dayjs(dt).format("YYYY-MM-DD");
        } else if (val && field.datatype === "TIME") {
            const { hour, minute, second } = val as NgwTime;
            const dt = new Date(0, 0, 0, hour, minute, second);
            val = dayjs(dt).format("HH:mm:ss");
        } else if (val && field.datatype === "DATETIME") {
            const { year, month, day, hour, minute, second } =
                val as NgwDateTime;
            const dt = new Date(year, month - 1, day, hour, minute, second);
            val = dayjs(dt).format("YYYY-MM-DD HH:mm:ss");
        }

        const dataItem: FieldDataItem = {
            key: key++,
            attr: field.display_name,
            value: val as string,
        };

        if (val !== null) {
            if (urlRegex.test(val as string)) {
                const matchUrl = (val as string).match(urlRegex);
                if (matchUrl) {
                    const urlSimiliar = matchUrl[1];
                    const target = urlSimiliar.match(/https?:/)
                        ? "_blank"
                        : "_self";
                    dataItem.value = (
                        <a target={target} href={urlSimiliar}>
                            {urlSimiliar}
                        </a>
                    );
                }
            } else if (emailRegex.test(val as string)) {
                const href = `mailto:${val}`;
                dataItem.value = <a href={href}>{val as string}</a>;
            } else {
                if (field.lookup_table) {
                    const lval = lookup(field.lookup_table.id, val as string);
                    if (lval !== null) {
                        val = `[${val}] ${lval}`;
                    }
                }
                dataItem.value = val as string;
            }
        } else {
            dataItem.value = gettext("N/A");
        }

        dataSource.push(dataItem);
    }
    return dataSource;
};
