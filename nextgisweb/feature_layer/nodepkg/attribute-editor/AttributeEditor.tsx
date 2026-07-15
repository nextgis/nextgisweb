import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";

import type { EditorWidgetProps } from "@nextgisweb/feature-layer/feature-editor/type";
import type {
  FeatureLayerFieldDatatype,
  FeatureLayerFieldRead,
} from "@nextgisweb/feature-layer/type/api";
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
import type { DatePickerProps, TimePickerProps } from "@nextgisweb/gui/antd";
import { ExpandableText, LoadingWrapper } from "@nextgisweb/gui/component";
import { BooleanInput } from "@nextgisweb/gui/component/BooleanInput";
import { FieldsForm, Form } from "@nextgisweb/gui/fields-form";
import type { FormField, SizeType } from "@nextgisweb/gui/fields-form";
import { LookupSelect } from "@nextgisweb/lookup-table/component/lookup-select";
import { gettext } from "@nextgisweb/pyramid/i18n";

import AttributeEditorStore from "./AttributeEditorStore";
import { JsonAttributeInput } from "./JsonAttributeInput";
import type { NgwAttributeValue } from "./type";

import BackspaceIcon from "@nextgisweb/icon/material/backspace";

import "./AttributeEditor.less";

const style = { width: "100%" };

const msgSetNull = gettext("Set field value to NULL (No data)");
const msgNoAttrs = gettext("There are no attributes in the vector layer");

type AttributeEditorStoreProps = EditorWidgetProps<
  AttributeEditorStore,
  {
    fields?: FeatureLayerFieldRead[];
    size?: SizeType;
    onChange?: (value: NgwAttributeValue | null) => void;
  }
>;

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

    const {
      fields,
      saving,
      isReady,
      attributes,
      loadRevision,
      setValidator,
      setValues,
    } = store;

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
      if (isReady) {
        form.resetFields();
      }
    }, [isReady, loadRevision, form, fields]);

    useEffect(() => {
      if (onChange) {
        onChange(store.value);
      }
    }, [store.value, onChange]);

    const validate = useCallback(async () => {
      try {
        await form.validateFields();
        return true;
      } catch {
        return false;
      }
    }, [form]);

    useEffect(() => {
      setValidator(validate);
      return () => setValidator(undefined);
    }, [setValidator, validate]);

    const getNgwTypeAliases = useCallback(
      ({
        placeholder,
      }: {
        placeholder?: string;
      }): Record<FeatureLayerFieldDatatype, ReactElement> => {
        const common = {
          placeholder,
          allowClear: false,
          disabled: saving,
          style,
        };

        const dpProps: DatePickerProps = common;
        const tpProps: TimePickerProps = common;

        const inputProps = {
          placeholder,
          allowClear: false,
          disabled: saving,
          style,
        };
        return {
          TIME: <TimePicker {...tpProps} />,
          DATE: <DatePicker {...dpProps} />,
          REAL: <InputNumber {...inputProps} />,
          BIGINT: <InputBigInteger {...inputProps} />,
          STRING: <Input {...inputProps} />,
          INTEGER: <InputInteger {...inputProps} />,
          DATETIME: <DateTimePicker {...dpProps} />,
          BOOLEAN: <BooleanInput {...inputProps} />,
          JSON: <JsonAttributeInput {...inputProps} />,
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
          formItem = getNgwTypeAliases({ placeholder })[field.datatype];
        }
        if (formItem) {
          const props: FormField = {
            name: field.keyname,
            label: (
              <ExpandableText maxLines={2} button={false} tooltip={true}>
                {field.display_name}
              </ExpandableText>
            ),
            formItem,
            required: field.required,

            append: (
              <Tooltip title={msgSetNull} placement="right">
                <Button
                  onClick={() => {
                    setNullForField(field.keyname);
                  }}
                >
                  <BackspaceIcon style={{ verticalAlign: "middle" }} />
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
        classNames={{
          root: "ngw-feature-layer-attribute-editor",
          label: "ngw-feature-layer-attribute-label",
        }}
        size={size}
        labelCol={{ span: 6 }}
        virtualize
        form={form}
        fields={formFields}
        initialValues={attributes}
        onChange={(v) => {
          setValues(v.value);
        }}
      >
        {!formFields.length && <p>{msgNoAttrs}</p>}
      </FieldsForm>
    );
  }
);

AttributeEditor.displayName = "AttributeEditor";

export default AttributeEditor;
