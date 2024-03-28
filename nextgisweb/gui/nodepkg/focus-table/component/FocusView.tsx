import { FieldsForm, useForm } from "@nextgisweb/gui/fields-form";
import type {
    FieldsFormProps,
    FormOnChangeOptions,
} from "@nextgisweb/gui/fields-form";

import type {
    GetItemFieldsFunction,
    StringKeys,
    TreeItem,
    TreeItemData,
} from "../type";

export interface FocusProps<V extends TreeItemData = TreeItemData> {
    form?: Omit<FieldsFormProps<StringKeys<V>>, "fields">;
}

interface FocusViewProps<V extends TreeItemData = TreeItemData>
    extends FocusProps {
    item: TreeItem<V>;
    getItemFields?: GetItemFieldsFunction<V> | null;
    onChange?: (item: TreeItem, options: FormOnChangeOptions) => void;
    initialValues?: Record<string, unknown>;
    style?: React.CSSProperties;
}

export function FocusView<V extends TreeItemData = TreeItemData>({
    item,
    style,
    initialValues,
    getItemFields,
    onChange,
    form: formProps,
}: FocusViewProps<V>) {
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
                    {...formProps}
                />
            )}
        </div>
    );
}
