import { useState } from "react";

import { Button, InputNumber, Select } from "@nextgisweb/gui/antd";
import { CloseIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgDotted = gettext("Dotted");
const msgDashed = gettext("Dashed");
const msgDashDotted = gettext("Dash - dotted");
const msgDash = gettext("Dash");
const msgGap = gettext("Gap");

const { Option } = Select;

interface DashPatternInputProps {
    value?: number[];
    onChange?: (value: number[]) => void;
    lineWidth?: number; // Line width used for calculating preset values
}

export const DashPatternInput: React.FC<DashPatternInputProps> = ({
    value = [],
    onChange,
    lineWidth = 1,
}) => {
    const [dashPattern, setDashPattern] = useState<number[]>(value);
    const [preset, setPreset] = useState<string>("");

    const handleInputChange = (index: number, newValue: number | null) => {
        if (newValue === null || isNaN(newValue)) return; // Ignore invalid inputs

        const newDashPattern = [...dashPattern];
        newDashPattern[index] = newValue;
        setDashPattern(newDashPattern);
        if (onChange) {
            onChange(newDashPattern);
        }
    };

    const handlePresetChange = (presetName: string) => {
        let newDashPattern: number[] = [];
        switch (presetName) {
            case "Dotted":
                newDashPattern = [lineWidth, lineWidth];
                break;
            case "Dashed":
                newDashPattern = [lineWidth * 3, lineWidth];
                break;
            case "Dash-Dotted":
                newDashPattern = [
                    lineWidth * 3,
                    lineWidth,
                    lineWidth,
                    lineWidth,
                ];
                break;
            default:
                newDashPattern = [];
                break;
        }
        setDashPattern(newDashPattern);
        setPreset(presetName);
        if (onChange) {
            onChange(newDashPattern);
        }
    };

    const handleDeleteRow = (index: number) => {
        const newDashPattern = [...dashPattern];
        newDashPattern.splice(index, 2);
        setDashPattern(newDashPattern);
        if (onChange) {
            onChange(newDashPattern);
        }
    };

    const renderInputFields = () => {
        const fields: JSX.Element[] = [];
        for (let i = 0; i < dashPattern.length + 2; i += 2) {
            fields.push(
                <div
                    key={i}
                    style={{
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <InputNumber
                        value={dashPattern[i]}
                        onChange={(value) => handleInputChange(i, value)}
                        placeholder={msgGap}
                        min={0}
                        style={{ width: "90px", marginRight: "12px" }}
                    />
                    <InputNumber
                        value={dashPattern[i + 1]}
                        onChange={(value) => handleInputChange(i + 1, value)}
                        placeholder={msgDash}
                        min={0}
                        style={{
                            width: "90px",
                        }}
                    />
                    <Button
                        type="text"
                        danger
                        icon={<CloseIcon />}
                        onClick={() => handleDeleteRow(i)}
                        style={{ marginLeft: 8 }}
                    />
                </div>
            );
        }
        return fields;
    };

    return (
        <div>
            <Select
                value={preset}
                onChange={handlePresetChange}
                placeholder="Select a preset"
                style={{ width: "100%", marginBottom: 16 }}
            >
                <Option value="Dotted">{msgDotted}</Option>
                <Option value="Dashed">{msgDashed}</Option>
                <Option value="Dash-Dotted">{msgDashDotted}</Option>
            </Select>

            {renderInputFields()}
        </div>
    );
};
