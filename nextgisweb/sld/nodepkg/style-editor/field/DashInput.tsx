import { useEffect, useState } from "react";

import { Button, InputNumber, Select } from "@nextgisweb/gui/antd";
import { CloseIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { LinePatternPresetView } from "../component/LinePatternPresetView";
import { getLinePatternPresets } from "../util/linePatternPresets";

const msgDash = gettext("Dash");
const msgGap = gettext("Gap");

const { Option } = Select;

interface DashPatternInputProps {
    value?: number[];
    onChange?: (value: number[] | undefined) => void;
    lineWidth?: number; // Line width used for calculating preset values
}

export const DashPatternInput: React.FC<DashPatternInputProps> = ({
    value = [],
    onChange,
    lineWidth = 3,
}) => {
    const [dashPattern, setDashPattern] = useState<number[]>(value);
    const [preset, setPreset] = useState<string>(() =>
        Array.isArray(value) && value.length === 0 ? "line" : ""
    );

    useEffect(() => {
        if (preset) {
            const newPattern =
                getLinePatternPresets(lineWidth).find(
                    (pr) => pr.keyname === preset
                )?.value.dasharray || [];
            console.log;
            setDashPattern((old) => {
                if (JSON.stringify(old) !== JSON.stringify(newPattern)) {
                    if (onChange) {
                        onChange(newPattern);
                    }
                    return newPattern;
                } else {
                    return old;
                }
            });
        }
    }, [lineWidth, onChange, preset]);

    const handleInputChange = (index: number, newValue: number | null) => {
        setPreset("");
        if (newValue === null || isNaN(newValue)) return;
        const newDashPattern = [...dashPattern];

        newDashPattern[index] = newValue;

        const isDashField = index % 2 === 0;
        const pairedIndex = isDashField ? index + 1 : index - 1;

        if (newValue !== 0 && newDashPattern[pairedIndex] === undefined) {
            newDashPattern[pairedIndex] = 0;
        }

        setDashPattern(newDashPattern);
        if (onChange) {
            const resultNewDashPattern =
                newDashPattern.length === 0 ? undefined : newDashPattern;
            onChange(resultNewDashPattern);
        }
    };

    const handlePresetChange = (presetName: string) => {
        const newDashPatternPreset = getLinePatternPresets(lineWidth).find(
            (preset) => preset.keyname === presetName
        );

        if (!newDashPatternPreset) {
            return;
        } else {
            const newDashPattern = newDashPatternPreset.value.dasharray || [];
            setDashPattern(newDashPattern);
            setPreset(presetName);
            if (onChange) {
                const resultNewDashPattern =
                    newDashPattern.length === 0 ? undefined : newDashPattern;
                onChange(resultNewDashPattern);
            }
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
            const isLastRow = i >= dashPattern.length;

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
                        value={isLastRow ? undefined : dashPattern[i]}
                        onChange={(value) => {
                            setPreset("");
                            handleInputChange(i, value);
                        }}
                        placeholder={msgDash}
                        min={0}
                        style={{ width: "90px", marginRight: "12px" }}
                    />
                    <InputNumber
                        value={isLastRow ? undefined : dashPattern[i + 1]}
                        onChange={(value) => {
                            setPreset("");
                            handleInputChange(i + 1, value);
                        }}
                        placeholder={msgGap}
                        min={0}
                        style={{ width: "90px" }}
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
                {getLinePatternPresets(lineWidth).map((preset) => (
                    <Option key={preset.keyname} value={preset.keyname}>
                        <LinePatternPresetView
                            presetData={preset}
                            width={lineWidth}
                        />
                    </Option>
                ))}
            </Select>

            {renderInputFields()}
        </div>
    );
};
