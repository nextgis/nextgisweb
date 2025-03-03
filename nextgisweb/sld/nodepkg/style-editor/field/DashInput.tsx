import { useState } from "react";

import { Button, InputNumber, Select } from "@nextgisweb/gui/antd";
import { CloseIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgDotted = gettext("Dotted");
const msgDashed = gettext("Dashed");
const msgDashDotted = gettext("Dash - dotted");
const msgDash = gettext("Dash");
const msgGap = gettext("Gap");
const msgLine = gettext("Line");

const { Option } = Select;

interface DashPatternInputProps {
    value?: number[];
    onChange?: (value: number[] | undefined) => void;
    lineWidth?: number; // Line width used for calculating preset values
}

export const DashPatternInput: React.FC<DashPatternInputProps> = ({
    value = [],
    onChange,
    lineWidth = 1,
}) => {
    const [dashPattern, setDashPattern] = useState<number[]>(value);
    const [preset, setPreset] = useState<string>(
        Array.isArray(value) && value.length === 0 ? "line" : ""
    );

    const handleInputChange = (index: number, newValue: number | null) => {
        if (newValue === null || isNaN(newValue)) return; // Ignore invalid inputs

        const newDashPattern = [...dashPattern];
        newDashPattern[index] = newValue;
        setDashPattern(newDashPattern);
        if (onChange) {
            const resultNewDashPattern =
                newDashPattern.length === 0 ? undefined : newDashPattern;
            onChange(resultNewDashPattern);
        }
    };

    const handlePresetChange = (presetName: string) => {
        let newDashPattern: number[] = [];
        switch (presetName) {
            case "line":
                newDashPattern = [];
                break;
            case "dotted":
                newDashPattern = [lineWidth, lineWidth];
                break;
            case "dashed":
                newDashPattern = [lineWidth * 3, lineWidth];
                break;
            case "dash-dotted":
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
            const resultNewDashPattern =
                newDashPattern.length === 0 ? undefined : newDashPattern;
            onChange(resultNewDashPattern);
        }
    };

    const handleDeleteRow = (index: number) => {
        const newDashPattern = [...dashPattern];
        newDashPattern.splice(index, 2);
        setDashPattern(newDashPattern);
        if (onChange) {
            const resultNewDashPattern =
                newDashPattern.length === 0 ? undefined : newDashPattern;
            onChange(resultNewDashPattern);
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
                        onChange={(value) => {
                            setPreset("");
                            handleInputChange(i, value);
                        }}
                        placeholder={msgDash}
                        defaultValue={i === dashPattern.length ? undefined : 0}
                        min={0}
                        style={{ width: "90px", marginRight: "12px" }}
                    />
                    <InputNumber
                        value={dashPattern[i + 1]}
                        onChange={(value) => {
                            setPreset("");
                            handleInputChange(i + 1, value);
                        }}
                        placeholder={msgGap}
                        defaultValue={i === dashPattern.length ? undefined : 0}
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
                defaultValue="line"
            >
                <Option value="line">{msgLine}</Option>
                <Option value="dotted">{msgDotted}</Option>
                <Option value="dashed">{msgDashed}</Option>
                <Option value="dash-dotted">{msgDashDotted}</Option>
            </Select>

            {renderInputFields()}
        </div>
    );
};
