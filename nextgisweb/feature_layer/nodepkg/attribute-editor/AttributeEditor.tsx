import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";
import { Button, Tooltip } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import {
    BigInteger,
    DateInput,
    DateTimeInput,
    FieldsForm,
    Form,
    Input,
    Integer,
    Number,
    TimeInput,
} from "@nextgisweb/gui/fields-form";
import type {
    FormField,
    FormWidget,
    SizeType,
} from "@nextgisweb/gui/fields-form";
import { LookupSelectField } from "@nextgisweb/lookup-table/field/LookupSelectField";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FeatureLayerDataType, FeatureLayerField } from "../type";

import AttributeEditorStore from "./AttributeEditorStore";
import type { NgwAttributeValue } from "./type";

import BackspaceIcon from "@nextgisweb/icon/material/backspace";

const style = { width: "100%" };

const ngwTypeAliases: Record<
    FeatureLayerDataType,
    [widget: FormWidget, props?: Record<string, unknown>]
> = {
    STRING: [Input],
    REAL: [Number, { style }],
    INTEGER: [Integer, { style }],
    BIGINT: [BigInteger, { style }],
    DATETIME: [DateTimeInput, { style, allowClear: false }],
    DATE: [DateInput, { style, allowClear: false }],
    TIME: [TimeInput, { style, allowClear: false }],
};

const msgSetNull = gettext("Set field value to NULL (No data)");
const msgNoAttrs = gettext("There are no attributes in the vector layer");

interface AttributeEditorStoreProps
    extends EditorWidgetProps<NgwAttributeValue | null, AttributeEditorStore> {
    fields?: FeatureLayerField[];
    onChange?: (value: NgwAttributeValue | null) => void;
}

const AttributeEditor = observer(
    ({
        store: store_,
        fields: fields_,
        onChange,
    }: AttributeEditorStoreProps) => {
        const [store] = useState(() => {
            if (store_) {
                return store_;
            }
            return new AttributeEditorStore({ fields: fields_ });
        });

        const { fields, attributes, isReady, setValues, saving } = store;
        const [size] = useState<SizeType>();
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

        const formFields = useMemo(() => {
            const fieldFormWidgets: FormField<string, FormWidget>[] = [];
            for (const field of fields) {
                let widget: FormWidget | undefined = undefined;
                let inputProps: Record<string, unknown> = {};

                if (field.lookup_table && field.lookup_table.id) {
                    widget = LookupSelectField;
                    inputProps.lookupId = field.lookup_table.id;
                } else {
                    const widgetAlias = ngwTypeAliases[field.datatype];
                    widget = widgetAlias[0];
                    inputProps = widgetAlias[1] || inputProps;
                }
                if (widget) {
                    const props: FormField = {
                        name: field.keyname,
                        label: field.display_name,
                        widget,
                        inputProps: {
                            readOnly: saving,
                            ...inputProps,
                        },
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

                    const val = attributes[field.keyname];
                    if (val === null) {
                        props.placeholder = "NULL";
                    }

                    fieldFormWidgets.push(props);
                }
            }
            return fieldFormWidgets;
        }, [fields, attributes, setNullForField, saving]);

        if (!isReady) {
            return <LoadingWrapper />;
        }

        return (
            <div className="ngw-gui-antd-tab-padding">
                <FieldsForm
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
            </div>
        );
    }
);

export default AttributeEditor;
