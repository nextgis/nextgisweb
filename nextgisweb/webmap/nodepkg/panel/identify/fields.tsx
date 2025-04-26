import type { Dayjs } from "dayjs";

import type { NgwAttributeType } from "@nextgisweb/feature-layer/type";
import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import {
    isDateType,
    parseNgwAttribute,
} from "@nextgisweb/feature-layer/util/ngwAttributes";
import { assert } from "@nextgisweb/jsrealm/error";
import { route } from "@nextgisweb/pyramid/api";
import type { GetRequestOptions } from "@nextgisweb/pyramid/api/type";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { load, lookup } from "./lookup";

export const getFieldsInfo = async (resourceId: number) => {
    const resourceInfo = await route("resource.item", resourceId).get({
        cache: true,
    });
    const fieldmap: Map<string, FeatureLayerFieldRead> = new Map();
    const promises: Promise<Record<string, string>>[] = [];

    assert(resourceInfo.feature_layer);
    resourceInfo.feature_layer.fields.forEach((fieldInfo) => {
        if (!fieldInfo.grid_visibility) {
            return;
        }
        fieldmap.set(fieldInfo.keyname, fieldInfo);
        if (fieldInfo.lookup_table !== null) {
            promises.push(load(fieldInfo.lookup_table.id));
        }
    });

    await Promise.all(promises);

    return fieldmap;
};

const urlRegex =
    /^\s*(((((https?|ftp|file|e1c):\/\/))|(((mailto|tel):)))[\S]+)\s*$/i;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FieldDataItem {
    key: number | string;
    attr?: string;
    value: string | React.ReactElement;
}

export async function fieldValuesToDataSource(
    fields: Record<string, NgwAttributeType>,
    fieldsInfo: Map<string, FeatureLayerFieldRead>,
    reuestOptions?: GetRequestOptions
): Promise<FieldDataItem[]> {
    let key = 0;
    const dataSource = [];

    for (const k in fields) {
        const field = fieldsInfo.get(k);
        if (!field) continue;
        let val = parseNgwAttribute(field.datatype, fields[k]);
        if (val !== null && isDateType(field.datatype)) {
            val = val as Dayjs;
            switch (field.datatype) {
                case "DATE":
                    val = val.format("L");
                    break;
                case "TIME":
                    val = val.format("LTS");
                    break;
                case "DATETIME":
                    val = val.format("L LTS");
                    break;
                default:
                    assert(false, `Unexpected datatype: ${field.datatype}`);
            }
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
                    const lval = await lookup(
                        field.lookup_table.id,
                        val as string,
                        reuestOptions
                    );
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
}
