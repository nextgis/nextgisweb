import { FieldsForm, useForm } from "@nextgisweb/gui/fields-form";
import type { FormOnChangeOptions } from "@nextgisweb/gui/fields-form";

import type { TreeDetailFormField, TreeItem } from "../type";

interface ResourceDetailProps {
    item: TreeItem;
    getItemFields?: (options: { item: TreeItem }) => TreeDetailFormField[];
    onChange?: (item: TreeItem, options: FormOnChangeOptions) => void;
    initialValues?: Record<string, unknown>;
    style?: React.CSSProperties;
}

export const ResourceDetail = ({
    item,
    style,
    initialValues,
    getItemFields,
    onChange,
}: ResourceDetailProps) => {
    const form = useForm()[0];

    return (
        <div style={style}>
            {getItemFields && (
                <FieldsForm
                    form={form}
                    fields={getItemFields({ item })}
                    onChange={(options) => {
                        onChange ? onChange(item, options) : undefined;
                    }}
                    initialValues={initialValues}
                />
            )}
        </div>
    );
};
