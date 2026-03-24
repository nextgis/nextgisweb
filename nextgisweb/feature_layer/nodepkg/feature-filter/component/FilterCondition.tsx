import { useDndContext } from "@dnd-kit/core";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { Dayjs } from "dayjs";
import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import {
  Button,
  DatePicker,
  DateTimePicker,
  Flex,
  InputBigInteger,
  InputInteger,
  InputNumber,
  InputValue,
  Select,
  Space,
  TimePicker,
} from "@nextgisweb/gui/antd";
import { RemoveIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { NgwAttributeType } from "../../type";
import {
  marshalFieldValue,
  unmarshalFieldValue,
} from "../../util/ngwAttributes";
import type { FilterEditorStore } from "../FilterEditorStore";
import { OPERATORS } from "../type";
import type {
  CmpOp,
  EqNeOp,
  FilterCondition as FilterConditionType,
  InOp,
  IsNullOp,
  ResolvedFieldRef,
} from "../type";
import {
  coerceTagValues,
  getMigratedConditionValue,
} from "../util/condition-value";
import {
  fieldRefToSelectValue,
  listFieldRefs,
  resolveFieldRef,
  selectValueToFieldRef,
} from "../util/field-ref";

import DragHandleIcon from "@nextgisweb/icon/material/drag_indicator";
import TagIcon from "@nextgisweb/icon/material/tag";
import ViewColumnIcon from "@nextgisweb/icon/material/view_column";

const msgDeleteCondition = gettext("Delete condition");
const msgNoValue = gettext("No value");
const msgAnyValue = gettext("Any value");
const msgInvalidField = gettext("Invalid field");
const msgFieldNotFound = gettext("Field not found");
const msgEnterValues = gettext("Enter values and press Enter");
const msgSelectField = gettext("Select field");
const msgOperator = gettext("Operator");
const msgEnterInteger = gettext("Enter integer");
const msgEnterBigInteger = gettext("Enter big integer");
const msgEnterNumber = gettext("Enter number");
const msgSelectDate = gettext("Select date");
const msgSelectTime = gettext("Select time");
const msgSelectDateTime = gettext("Select date and time");
const msgEnterValue = gettext("Enter value");

interface FilterConditionProps {
  condition: FilterConditionType;
  store: FilterEditorStore;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners?: SyntheticListenerMap;
  };
}

type ValueInput = string | number | null | Dayjs | Array<string | number>;
type FieldOption = {
  label: string;
  value: string;
  isVirtual: boolean;
};

const isNullOperator = (operator: FilterConditionType["operator"]) =>
  operator === "is_null" || operator === "!is_null";

const isListOperator = (operator: FilterConditionType["operator"]) =>
  operator === "in" || operator === "!in";

const getOperatorsForField = (field?: ResolvedFieldRef) => {
  if (!field) return OPERATORS;

  return OPERATORS.filter((op) => op.supportedTypes.includes(field.datatype));
};

const getPlaceholder = (
  condition: FilterConditionType,
  defaultPlaceholder: string,
  isValueInputDisabled: boolean
): string => {
  if (isValueInputDisabled) {
    return condition.operator === "is_null"
      ? gettext("No value")
      : gettext("Any value");
  }
  return defaultPlaceholder;
};

const calculateValue = (
  condition: FilterConditionType,
  field: ResolvedFieldRef
): NgwAttributeType => {
  const isValueNullable =
    condition.value === undefined || condition.value === null;
  const conditionValue = isValueNullable
    ? field.datatype === "STRING"
      ? ""
      : null
    : condition.value;
  return conditionValue as NgwAttributeType;
};

export const FilterCondition = observer(
  ({ condition, store, dragHandleProps }: FilterConditionProps) => {
    const { active, over } = useDndContext();
    const isDropTarget = over?.id === condition.id && over?.id !== active?.id;
    const availableFields = useMemo(
      () => listFieldRefs(store.fields),
      [store.fields]
    );
    const currentField = useMemo(
      () => resolveFieldRef(store.fields, condition.field),
      [condition.field, store.fields]
    );
    const availableOperators = useMemo(
      () => getOperatorsForField(currentField),
      [currentField]
    );
    const fieldOptions = useMemo(
      () =>
        availableFields.map((field) => ({
          label: field.label,
          value: fieldRefToSelectValue(field.ref),
          isVirtual: field.isVirtual,
        })),
      [availableFields]
    );
    const operatorOptions = useMemo(
      () =>
        availableOperators.map((operator) => ({
          label: operator.label,
          value: operator.value,
        })),
      [availableOperators]
    );

    const handleFieldChange = (nextFieldValue: string) => {
      const field = selectValueToFieldRef(nextFieldValue);
      if (!field) {
        return;
      }

      const nextField = resolveFieldRef(store.fields, field);
      const nextOperatorOptions = getOperatorsForField(nextField).map(
        (operator) => operator.value
      );
      const nextOperator = nextOperatorOptions.includes(condition.operator)
        ? condition.operator
        : (nextOperatorOptions[0] ?? condition.operator);

      const nextValue = getMigratedConditionValue({
        fields: store.fields,
        currentField: condition.field,
        currentOperator: condition.operator,
        currentValue: condition.value,
        nextField: field,
        nextOperator,
      });
      store.updateCondition(condition.id, {
        field,
        operator: nextOperator,
        value: nextValue,
      });
    };

    const handleOperatorChange = (
      operator: EqNeOp | CmpOp | InOp | IsNullOp
    ) => {
      const value = getMigratedConditionValue({
        fields: store.fields,
        currentField: condition.field,
        currentOperator: condition.operator,
        currentValue: condition.value,
        nextField: condition.field,
        nextOperator: operator,
      });
      store.updateCondition(condition.id, {
        operator,
        value,
      });
    };

    const handleValueChange = (value: ValueInput) => {
      if (!currentField) {
        return;
      }

      const serializedValue = marshalFieldValue(currentField.datatype, value);
      store.updateCondition(condition.id, { value: serializedValue });
    };

    const handleDateLikeChange = (value: Dayjs | Dayjs[] | null) => {
      handleValueChange(Array.isArray(value) ? null : value);
    };

    const handleDelete = () => {
      store.deleteCondition(condition.id);
    };

    const isValueInputDisabled = isNullOperator(condition.operator);

    const renderReadonlyValue = () => (
      <InputValue
        value={condition.operator === "is_null" ? msgNoValue : msgAnyValue}
        readOnly={true}
      />
    );

    const renderListValueInput = () => {
      if (!currentField) {
        return (
          <InputValue
            value={msgInvalidField}
            placeholder={msgFieldNotFound}
            disabled={true}
            status="error"
          />
        );
      }

      const handleTagChange = (values: string[]) => {
        handleValueChange(coerceTagValues(currentField.datatype, values));
      };

      const value = ((condition.value as Array<string | number>) || []).map(
        String
      );

      return (
        <Select
          mode="tags"
          value={value}
          onChange={handleTagChange}
          style={{ width: "100%" }}
          placeholder={msgEnterValues}
          tokenSeparators={[","]}
        />
      );
    };

    const renderScalarValueInput = () => {
      if (!currentField) {
        return (
          <InputValue
            value={msgInvalidField}
            placeholder={msgFieldNotFound}
            disabled={true}
            status="error"
          />
        );
      }

      if (isValueInputDisabled) {
        return renderReadonlyValue();
      }

      const conditionValue = calculateValue(condition, currentField);
      const displayValue = unmarshalFieldValue(
        currentField.datatype,
        conditionValue as NgwAttributeType
      );

      switch (currentField.datatype) {
        case "INTEGER":
          return (
            <InputInteger
              value={displayValue as number}
              onChange={handleValueChange}
              placeholder={getPlaceholder(
                condition,
                msgEnterInteger,
                isValueInputDisabled
              )}
              disabled={isValueInputDisabled}
            />
          );
        case "BIGINT":
          return (
            <InputBigInteger
              value={displayValue as string}
              onChange={handleValueChange}
              placeholder={getPlaceholder(
                condition,
                msgEnterBigInteger,
                isValueInputDisabled
              )}
              disabled={isValueInputDisabled}
            />
          );
        case "REAL":
          return (
            <InputNumber
              value={displayValue as number}
              onChange={handleValueChange}
              step={0.01}
              placeholder={getPlaceholder(
                condition,
                msgEnterNumber,
                isValueInputDisabled
              )}
              disabled={isValueInputDisabled}
            />
          );
        case "DATE":
          return (
            <DatePicker
              value={displayValue as Dayjs}
              onChange={handleDateLikeChange}
              placeholder={getPlaceholder(
                condition,
                msgSelectDate,
                isValueInputDisabled
              )}
              disabled={isValueInputDisabled}
            />
          );
        case "TIME":
          return (
            <TimePicker
              value={displayValue as Dayjs}
              onChange={handleDateLikeChange}
              placeholder={getPlaceholder(
                condition,
                msgSelectTime,
                isValueInputDisabled
              )}
              disabled={isValueInputDisabled}
            />
          );
        case "DATETIME":
          return (
            <DateTimePicker
              value={displayValue as Dayjs}
              onChange={handleDateLikeChange}
              placeholder={getPlaceholder(
                condition,
                msgSelectDateTime,
                isValueInputDisabled
              )}
              disabled={isValueInputDisabled}
            />
          );
        default:
          return (
            <InputValue
              value={displayValue as string}
              onChange={handleValueChange}
              placeholder={getPlaceholder(
                condition,
                msgEnterValue,
                isValueInputDisabled
              )}
              disabled={isValueInputDisabled}
            />
          );
      }
    };

    const renderValueInput = () =>
      isListOperator(condition.operator)
        ? renderListValueInput()
        : renderScalarValueInput();

    const renderFieldOption = ({ label, isVirtual }: FieldOption) => (
      <Flex gap="small" align="center">
        {isVirtual ? <TagIcon /> : <ViewColumnIcon />}
        {label}
      </Flex>
    );

    const dropTargetClassName = isDropTarget ? "drop-target" : "";

    return (
      <div className={`filter-condition ${dropTargetClassName}`}>
        <Space>
          <DragHandleIcon
            className="filter-drag-handle"
            style={{ cursor: "move" }}
            {...dragHandleProps?.attributes}
            {...dragHandleProps?.listeners}
          />

          <Select
            value={fieldRefToSelectValue(condition.field)}
            onChange={handleFieldChange}
            style={{ width: 150 }}
            placeholder={msgSelectField}
            options={fieldOptions}
            optionRender={(option) =>
              renderFieldOption(option.data as FieldOption)
            }
          />

          <Select
            value={condition.operator}
            onChange={handleOperatorChange}
            style={{ width: 120 }}
            placeholder={msgOperator}
            options={operatorOptions}
          />

          {renderValueInput()}

          <Button
            type="text"
            icon={<RemoveIcon />}
            onClick={handleDelete}
            size="small"
            title={msgDeleteCondition}
          />
        </Space>
      </div>
    );
  }
);

FilterCondition.displayName = "FeatureFilterCondition";
