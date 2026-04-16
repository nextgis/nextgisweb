import { useDndContext } from "@dnd-kit/core";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { Dayjs } from "dayjs";
import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { Button, Flex, Select, Space } from "@nextgisweb/gui/antd";
import { RemoveIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { marshalFieldValue } from "../../util/ngwAttributes";
import type { FilterEditorStore } from "../FilterEditorStore";
import { OPERATORS } from "../type";
import type {
  CmpOp,
  EqNeOp,
  FilterCondition as FilterConditionType,
  IlikeOp,
  InOp,
  IsNullOp,
  ResolvedFieldRef,
} from "../type";
import { getMigratedConditionValue } from "../util/condition-value";
import {
  fieldRefToSelectValue,
  listFieldRefs,
  resolveFieldRef,
  selectValueToFieldRef,
} from "../util/field-ref";

import { FilterValueInput } from "./FilterValueInput";

import DragHandleIcon from "@nextgisweb/icon/material/drag_indicator";
import TagIcon from "@nextgisweb/icon/material/tag";
import ViewColumnIcon from "@nextgisweb/icon/material/view_column";

const msgDeleteCondition = gettext("Delete condition");

const msgSelectField = gettext("Select field");
const msgOperator = gettext("Operator");

interface FilterConditionProps {
  condition: FilterConditionType;
  store: FilterEditorStore;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners?: SyntheticListenerMap;
  };
}

export type ValueInput =
  | string
  | number
  | null
  | Dayjs
  | Array<string | number>;

type FieldOption = {
  label: string;
  value: string;
  isVirtual: boolean;
};

const getOperatorsForField = (field?: ResolvedFieldRef) => {
  if (!field) return OPERATORS;

  return OPERATORS.filter((op) => op.supportedTypes.includes(field.datatype));
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
      operator: EqNeOp | CmpOp | InOp | IsNullOp | IlikeOp
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

    const handleDelete = () => {
      store.deleteCondition(condition.id);
    };

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

          <FilterValueInput
            condition={condition}
            field={currentField}
            valueWidget={store.valueWidget}
            onChange={handleValueChange}
          />

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
