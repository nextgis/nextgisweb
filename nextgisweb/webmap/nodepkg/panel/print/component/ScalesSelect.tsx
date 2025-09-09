import { useEffect, useRef, useState } from "react";
import type { FC, ReactNode } from "react";

import { Divider, InputNumber, Select } from "@nextgisweb/gui/antd";
import { useDebounce } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { scaleToLabel } from "../options";
import type { Scale } from "../options";
import { formatScaleNumber } from "../util";

import "./ScalesSelect.css";

const validateCustomScale = (value: number | null): boolean =>
    value !== null && Number.isInteger(value) && value > 0;

interface ScalesSelectProps {
    value: number | undefined;
    scales: Scale[];
    onChange: (scale: number) => void;
}

export const ScalesSelect: FC<ScalesSelectProps> = ({
    value,
    scales,
    onChange,
}) => {
    const [open, setOpen] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const changeCustomScale = (val: number | null) => {
        if (validateCustomScale(val) && val !== null && val !== value) {
            onChange(val);
        }
    };

    const debouncedOnChange = useDebounce(changeCustomScale, 500);

    const onPressEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const inputValue = (e.target as HTMLInputElement)?.value.replace(
            /\s/g,
            ""
        );
        changeCustomScale(Number(inputValue));
    };

    useEffect(() => {
        if (open) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [open]);

    const popupRender = (menu: ReactNode) => (
        <>
            {menu}
            <Divider style={{ margin: "5px 0" }} />
            <div className="custom-scale">
                <div className="prefix">1 : </div>
                <div className="input">
                    <InputNumber
                        ref={inputRef}
                        min={1}
                        max={1000000000}
                        placeholder={gettext("Custom scale")}
                        value={value}
                        onChange={debouncedOnChange}
                        formatter={(value) => {
                            if (!value) return "";
                            return formatScaleNumber(value);
                        }}
                        onPressEnter={onPressEnter}
                        style={{ width: "100%" }}
                    />
                </div>
            </div>
        </>
    );

    return (
        <Select
            style={{ width: "100%" }}
            popupRender={popupRender}
            onChange={onChange}
            onOpenChange={setOpen}
            value={value}
            labelRender={(e) => scaleToLabel(Number(e.value))}
            options={scales}
        ></Select>
    );
};
ScalesSelect.displayName = "ScalesSelect";
