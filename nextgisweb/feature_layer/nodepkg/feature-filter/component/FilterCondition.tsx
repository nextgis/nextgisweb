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

export const FilterCondition = observer(
    ({ condition, store, dragHandleProps }: FilterConditionProps) => {
        const handleFieldChange = (field: string) => {
            store.updateConditionField(condition.id, field);
        };

        const handleOperatorChange = (operator: string) => {
            store.updateConditionOperator(condition.id, operator);
        };

        const handleValueChange = (value: any) => {
            store.updateConditionValue(condition.id, value);
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

        const renderValueInput = () => {
            const field = store.fields.find(
                (f) => f.keyname === condition.field
            );
            if (!field)
                return (
                    <InputValue
                        value={condition.value}
                        onChange={handleValueChange}
                        placeholder={gettext("Enter value")}
                    />
                );

            switch (field.datatype) {
                case "INTEGER":
                    return (
                        <InputInteger
                            value={condition.value}
                            onChange={handleValueChange}
                            placeholder={gettext("Enter integer")}
                        />
                    );
                case "BIGINT":
                    return (
                        <InputBigInteger
                            value={condition.value}
                            onChange={handleValueChange}
                            placeholder={gettext("Enter big integer")}
                        />
                    );
                case "REAL":
                    return (
                        <InputNumber
                            value={condition.value}
                            onChange={handleValueChange}
                            step={0.01}
                            placeholder={gettext("Enter number")}
                        />
                    );
                case "DATE":
                    return (
                        <DatePicker
                            value={condition.value}
                            onChange={handleValueChange}
                            placeholder={gettext("Select date")}
                        />
                    );
                case "TIME":
                    return (
                        <TimePicker
                            value={condition.value}
                            onChange={handleValueChange}
                            placeholder={gettext("Select time")}
                        />
                    );
                case "DATETIME":
                    return (
                        <DateTimePicker
                            value={condition.value}
                            onChange={handleValueChange}
                            placeholder={gettext("Select date and time")}
                        />
                    );
                default:
                    return (
                        <InputValue
                            value={condition.value}
                            onChange={handleValueChange}
                            placeholder={gettext("Enter value")}
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
