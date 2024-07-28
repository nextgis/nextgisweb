import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";
import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import {
    Button,
    DatePicker,
    DateTimePicker,
    Input,
    InputBigInteger,
    InputInteger,
    InputNumber,
    TimePicker,
    Tooltip,
} from "@nextgisweb/gui/antd";
import type { DatePickerProps } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { FieldsForm, Form } from "@nextgisweb/gui/fields-form";
import type { FormField, SizeType } from "@nextgisweb/gui/fields-form";
import { LookupSelect } from "@nextgisweb/lookup-table/component/lookup-select";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FeatureLayerDataType } from "../type";

import AttributeEditorStore from "./AttributeEditorStore";
import type { NgwAttributeValue } from "./type";

import BackspaceIcon from "@nextgisweb/icon/material/backspace";

const style = { width: "100%" };

const msgSetNull = gettext("Set field value to NULL (No data)");
const msgNoAttrs = gettext("There are no attributes in the vector layer");

interface AttributeEditorStoreProps
    extends EditorWidgetProps<NgwAttributeValue | null, AttributeEditorStore> {
    fields?: FeatureLayerFieldRead[];
    size?: SizeType;
    onChange?: (value: NgwAttributeValue | null) => void;
}

const AttributeEditor = observer(
    ({
        store: store_,
        fields: fields_,
        size = "middle",
        onChange,
    }: AttributeEditorStoreProps) => {
        const [store] = useState(() => {
            if (store_) {
                return store_;
            }
            return new AttributeEditorStore({ fields: fields_ });
        });

        const { fields, attributes, isReady, setValues, saving } = store;

        const form = Form.useForm()[0];

        const setNullForField = useCallback(
            (field: string) => {
                form.setFieldValue(field, null);
                setValues({ [field]: null });
            },
            [form, setValues]
        );

        useEffect(() => {
            if (isReady) {
                form.setFieldsValue(attributes);
            }
        }, [isReady, form, attributes]);

        useEffect(() => {
            if (onChange) {
                onChange(store.value);
            }
        }, [store.value, onChange]);

        const getNgwTypeAliases = useCallback(
            ({
                placeholder,
            }: {
                placeholder?: string;
            }): Record<FeatureLayerDataType, React.ReactElement> => {
                const dpProps: DatePickerProps = {
                    style,
                    placeholder,
                    allowClear: false,
                    disabled: saving,
                };
                const inputProps = {
                    placeholder,
                    disabled: saving,
                    style,
                };
                return {
                    STRING: <Input {...inputProps} />,
                    REAL: <InputNumber {...inputProps} />,
                    INTEGER: <InputInteger {...inputProps} />,
                    BIGINT: <InputBigInteger {...inputProps} />,
                    DATETIME: <DateTimePicker {...dpProps} />,
                    DATE: <DatePicker {...dpProps} />,
                    TIME: <TimePicker {...dpProps} />,
                };
            },
            [saving]
        );

        const formFields = useMemo(() => {
            const fieldFormWidgets: FormField<string>[] = [];
            for (const field of fields) {
                let formItem: FormField["formItem"] | undefined = undefined;

                const val = attributes[field.keyname];
                let placeholder: string | undefined = undefined;
                if (val === null) {
                    placeholder = "NULL";
                }

                if (field.lookup_table && field.lookup_table.id !== undefined) {
                    formItem = (
                        <LookupSelect
                            lookupId={field.lookup_table.id}
                            placeholder={placeholder}
                            disabled={saving}
                        />
                    );
                } else {
                    formItem = getNgwTypeAliases({ placeholder })[
                        field.datatype
                    ];
                }
                if (formItem) {
                    const props: FormField = {
                        name: field.keyname,
                        label: field.display_name,
                        formItem,

                        append: (
                            <Tooltip title={msgSetNull} placement="right">
                                <Button
                                    onClick={() => {
                                        setNullForField(field.keyname);
                                    }}
                                >
                                    <BackspaceIcon
                                        style={{ verticalAlign: "middle" }}
                                    />
                                </Button>
                            </Tooltip>
                        ),
                    };

                    fieldFormWidgets.push(props);
                }
            }
            return fieldFormWidgets;
        }, [fields, attributes, saving, getNgwTypeAliases, setNullForField]);

        if (!isReady) {
            return <LoadingWrapper />;
        }

        return (
            <FieldsForm
                virtualize
                form={form}
                size={size}
                fields={formFields}
                initialValues={attributes}
                onChange={async (v) => {
                    if (await v.isValid()) {
                        setValues(v.value);
                    }
                }}
            >
                {!formFields.length && <p>{msgNoAttrs}</p>}
            </FieldsForm>
        );
    }
);

AttributeEditor.displayName = "AttributeEditor";

export default AttributeEditor;
