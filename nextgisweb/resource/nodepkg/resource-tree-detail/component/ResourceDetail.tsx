import { Space } from "@nextgisweb/gui/antd";
import { FieldsForm, useForm } from "@nextgisweb/gui/fields-form";
import type {
    FormField,
    FormOnChangeOptions,
} from "@nextgisweb/gui/fields-form";

import type { TreeItem } from "../type";

interface ResourceDetailProps {
    item: TreeItem;
    getItemForm?: (options: { item: TreeItem }) => FormField[];
    onChange?: (item: TreeItem, options: FormOnChangeOptions) => void;
    initialValues?: Record<string, unknown>;
    style?: React.CSSProperties;
}

export const ResourceDetail = ({
    item,
    style,
    initialValues,
    getItemForm,
    onChange,
}: ResourceDetailProps) => {
    const form = useForm()[0];

    return (
        <Space direction="vertical" style={style}>
            <h4>{item.data.title}</h4>
            {getItemForm && (
                <FieldsForm
                    form={form}
                    fields={getItemForm({ item })}
                    onChange={(options) => {
                        onChange ? onChange(item, options) : undefined;
                    }}
                    initialValues={initialValues}
                />
            )}
        </Space>
    );
};
