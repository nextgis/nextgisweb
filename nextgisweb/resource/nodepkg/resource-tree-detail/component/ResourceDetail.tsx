import { observer } from "mobx-react-lite";

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
}

export const ResourceDetail = observer(
    ({ item, getItemForm, onChange, initialValues }: ResourceDetailProps) => {
        const form = useForm()[0];

        return (
            <Space direction="vertical">
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
    }
);
