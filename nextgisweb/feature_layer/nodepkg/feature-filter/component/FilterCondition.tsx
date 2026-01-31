import { useDndContext } from "@dnd-kit/core";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { observer } from "mobx-react-lite";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import {
    Button,
    DatePicker,
    DateTimePicker,
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
    HasOp,
    InOp,
    OperatorValueMap,
} from "../type";

import DragHandleIcon from "@nextgisweb/icon/material/drag_indicator";

const msgDeleteCondition = gettext("Delete Condition");

interface FilterConditionProps {
    condition: FilterConditionType;
    store: FilterEditorStore;
    dragHandleProps?: {
        attributes: DraggableAttributes;
        listeners?: SyntheticListenerMap;
    };
}

const getPlaceholder = (
    condition: FilterConditionType,
    defaultPlaceholder: string,
    isValueInputDisabled: boolean
): string => {
    if (isValueInputDisabled) {
        return condition.operator === "has"
            ? gettext("Any value")
            : gettext("No value");
    }
    return defaultPlaceholder;
};

export const getDefaultValue = <O extends keyof OperatorValueMap>(
    fields: FeatureLayerFieldRead[],
    field: string,
    operator: O
): OperatorValueMap[O] => {
    const fieldInfo = fields.find((f) => f.keyname === field);
    const wantsNoValue = ["has", "!has"].includes(operator);
    const wantsArray = ["in", "!in"].includes(operator);

    let defaultValue = undefined;

    if (wantsArray) {
        defaultValue = [];
    } else if (!wantsNoValue && fieldInfo) {
        if (wantsArray) {
            defaultValue = [];
        } else {
            switch (fieldInfo.datatype) {
                case "INTEGER":
                case "REAL":
                    defaultValue = 0;
                    break;
                case "BIGINT":
                    defaultValue = "0";
                    break;
                case "STRING":
                    defaultValue = "";
                    break;
                case "DATE":
                    defaultValue = dayjs().format("YYYY-MM-DD");
                    break;
                case "TIME":
                    defaultValue = dayjs().format("HH:mm:ss");
                    break;
                case "DATETIME":
                    defaultValue = dayjs().format("YYYY-MM-DDTHH:mm:ss");
                    break;
                default:
                    defaultValue = undefined;
            }
        }
    }
    return defaultValue as OperatorValueMap[O];
};

const calculateValue = (
    condition: FilterConditionType,
    field: FeatureLayerFieldRead
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
        const isDropTarget =
            over?.id === condition.id && over?.id !== active?.id;

        const handleFieldChange = (field: string) => {
            const defaultValue = getDefaultValue(
                store.fields,
                field,
                condition.operator
            );
            store.updateCondition(condition.id, { field, value: defaultValue });
        };

        const handleOperatorChange = (
            operator: EqNeOp | CmpOp | InOp | HasOp
        ) => {
            const defaultValue = getDefaultValue(
                store.fields,
                condition.field,
                operator
            );
            store.updateCondition(condition.id, {
                operator,
                value: defaultValue,
            });
        };

        const handleValueChange = (value: any) => {
            const field = store.fields.find(
                (f) => f.keyname === condition.field
            );
            if (!field) {
                return;
            }
            const serializedValue = marshalFieldValue(field.datatype, value);
            store.updateCondition(condition.id, { value: serializedValue });
        };

        const handleDelete = () => {
            store.deleteCondition(condition.id);
        };

        const getOperatorsForField = (fieldKey: string) => {
            const field = store.fields.find((f) => f.keyname === fieldKey);
            if (!field) return OPERATORS;

            return OPERATORS.filter((op) =>
                op.supportedTypes.includes(field.datatype)
            );
        };

        const isValueInputDisabled = ["has", "!has"].includes(
            condition.operator
        );

        const renderValueInput = () => {
            const field = store.fields.find(
                (f) => f.keyname === condition.field
            );
            if (!field) {
                return (
                    <InputValue
                        value={gettext("Invalid field")}
                        placeholder={gettext("Field not found")}
                        disabled={true}
                        status="error"
                    />
                );
            }

            const conditionValue = calculateValue(condition, field);

            const displayValue = unmarshalFieldValue(
                field.datatype,
                conditionValue as NgwAttributeType
            );

            if (["in", "!in"].includes(condition.operator)) {
                const numericTypes = ["INTEGER", "BIGINT", "REAL"];
                const isNumeric =
                    field && numericTypes.includes(field.datatype);

                const handleTagChange = (values: string[]) => {
                    let processedValues: (string | number)[] = values;
                    if (isNumeric) {
                        processedValues = values
                            .map((val) => parseFloat(val))
                            .filter((num) => !isNaN(num));
                    }
                    handleValueChange(processedValues);
                };

                const value = (
                    (condition.value as Array<string | number>) || []
                ).map(String);

                return (
                    <Select
                        mode="tags"
                        value={value}
                        onChange={handleTagChange}
                        style={{ width: "100%" }}
                        placeholder={gettext("Enter values and press Enter")}
                        tokenSeparators={[","]}
                    />
                );
            }

            switch (field.datatype) {
                case "INTEGER":
                    return (
                        <InputInteger
                            value={displayValue as number}
                            onChange={handleValueChange}
                            placeholder={getPlaceholder(
                                condition,
                                gettext("Enter integer"),
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
                                gettext("Enter big integer"),
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
                                gettext("Enter number"),
                                isValueInputDisabled
                            )}
                            disabled={isValueInputDisabled}
                        />
                    );
                case "DATE":
                    return (
                        <DatePicker
                            value={displayValue as Dayjs}
                            onChange={handleValueChange}
                            placeholder={getPlaceholder(
                                condition,
                                gettext("Select date"),
                                isValueInputDisabled
                            )}
                            disabled={isValueInputDisabled}
                        />
                    );
                case "TIME":
                    return (
                        <TimePicker
                            value={displayValue as Dayjs}
                            onChange={handleValueChange}
                            placeholder={getPlaceholder(
                                condition,
                                gettext("Select time"),
                                isValueInputDisabled
                            )}
                            disabled={isValueInputDisabled}
                        />
                    );
                case "DATETIME":
                    return (
                        <DateTimePicker
                            value={displayValue as Dayjs}
                            onChange={handleValueChange}
                            placeholder={getPlaceholder(
                                condition,
                                gettext("Select date and time"),
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
                                gettext("Enter value"),
                                isValueInputDisabled
                            )}
                            disabled={isValueInputDisabled}
                        />
                    );
            }
        };

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
                        value={condition.field}
                        onChange={handleFieldChange}
                        style={{ width: 150 }}
                        placeholder={gettext("Select field")}
                    >
                        {store.fields.map((field) => (
                            <Select.Option
                                key={field.keyname}
                                value={field.keyname}
                            >
                                {field.display_name}
                            </Select.Option>
                        ))}
                    </Select>

                    <Select
                        value={condition.operator}
                        onChange={handleOperatorChange}
                        style={{ width: 120 }}
                        placeholder={gettext("Operator")}
                    >
                        {getOperatorsForField(condition.field).map((op) => (
                            <Select.Option key={op.value} value={op.value}>
                                {op.label}
                            </Select.Option>
                        ))}
                    </Select>

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
