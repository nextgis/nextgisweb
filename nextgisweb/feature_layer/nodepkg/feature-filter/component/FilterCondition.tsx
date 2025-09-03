import { observer } from "mobx-react-lite";

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
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FilterEditorStore } from "../FilterEditorStore";
import { OPERATORS } from "../type";
import type { FilterCondition as FilterConditionType } from "../type";

import { DeleteOutlined, DragOutlined } from "@ant-design/icons";

const msgDeleteCondition = gettext("Delete Condition");

interface FilterConditionProps {
    condition: FilterConditionType;
    store: FilterEditorStore;
    dragHandleProps?: {
        attributes: any;
        listeners: any;
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

export const FilterCondition = observer(
    ({ condition, store, dragHandleProps }: FilterConditionProps) => {
        const handleFieldChange = (field: string) => {
            store.updateCondition(condition.id, { field });
        };

        const handleOperatorChange = (operator: string) => {
            const updates: Partial<FilterConditionType> = { operator };

            const wantsArray = ["in", "!in"].includes(operator);
            const wantsNoValue = ["has", "!has"].includes(operator);
            const isCurrentlyArray = Array.isArray(condition.value);

            if (isCurrentlyArray && !wantsArray) updates.value = undefined;
            if (wantsArray && !isCurrentlyArray) updates.value = [];
            if (wantsNoValue) updates.value = undefined;

            store.updateCondition(condition.id, updates);
        };

        const handleValueChange = (value: any) => {
            store.updateCondition(condition.id, { value });
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

                return (
                    <Select
                        mode="tags"
                        value={condition.value || []}
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
                            value={condition.value}
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
                            value={condition.value}
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
                            value={condition.value}
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
                            value={condition.value}
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
                            value={condition.value}
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
                            value={condition.value}
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
                            value={condition.value}
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

        return (
            <div className="filter-condition">
                <Space>
                    <DragOutlined
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
                        icon={<DeleteOutlined />}
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
