import { debounce } from "lodash-es";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FC, ReactNode } from "react";

import { Divider, InputNumber, Select } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { Scale } from "../options";

import "./ScalesSelect.css";

const numberFormat = new Intl.NumberFormat("ru-RU");
const validateCustomScale = (value: number | null) =>
    value && Number.isInteger(value) && value > 0;

interface ScalesSelectProps {
    selectedValue: number | undefined;
    scales: Scale[];
    onChange: (scale: number) => void;
}

export const ScalesSelect: FC<ScalesSelectProps> = ({
    selectedValue,
    scales,
    onChange,
}) => {
    const [customScale, setCustomScale] = useState<number | null>(null);
    const [open, setOpen] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (customScale === null) return;
        onChange(customScale);
    }, [customScale, onChange]);

    const changeCustomScale = useCallback((value: number | null) => {
        setCustomScale(validateCustomScale(value) ? value : null);
    }, []);

    const debouncedOnChange = debounce(changeCustomScale, 500);

    const onPressEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const inputValue = (e.target as HTMLInputElement)?.value.replace(
            /\s/g,
            ""
        );
        changeCustomScale(Number(inputValue));
        if (customScale && selectedValue !== customScale) onChange(customScale);
    };

    const onOpenChange = (open: boolean) => {
        setOpen(open);
    };

    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open, inputRef]);

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
                        value={customScale}
                        onChange={(v) => debouncedOnChange(v)}
                        formatter={(value) => {
                            if (!value) return "";
                            return numberFormat.format(value);
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
            onOpenChange={onOpenChange}
            value={selectedValue}
            options={scales}
        ></Select>
    );
};
ScalesSelect.displayName = "ScalesSelect";
