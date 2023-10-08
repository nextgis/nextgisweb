import { useEffect, useState } from "react";

import { Form } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { SymbolizerType } from "../../type/Style";

import { TypeField } from "./TypeField";

export interface KindSelectProps {
    value?: SymbolizerType;
    onChange?: (val: SymbolizerType) => void;
    fillEditor?: boolean;
    lineEditor?: boolean;
    markEditor?: boolean;
}

const msgKind = gettext("Type");

export function TypeSelect({
    value = "point",
    onChange,
    fillEditor = true,
    lineEditor = true,
    markEditor = true,
}: KindSelectProps) {
    const [kind, setKind] = useState<SymbolizerType>(value);

    const kindVisibility: Record<SymbolizerType, boolean> = {
        "point": markEditor,
        "line": lineEditor,
        "polygon": fillEditor,
    };

    const onKindChange = (kind_: SymbolizerType) => {
        setKind(kind_);
    };

    const symbolizerKinds: SymbolizerType[] = ["point", "polygon", "line"];
    const filteredSymbolizerKinds = symbolizerKinds.filter((kind_) => {
        return kindVisibility[kind_];
    });

    useEffect(() => {
        if (onChange && kind) {
            onChange(kind);
        }
    }, [kind, onChange]);

    return (
        <Form>
            <Form.Item label={msgKind}>
                <TypeField
                    kind={kind}
                    onChange={onKindChange}
                    symbolizerKinds={filteredSymbolizerKinds}
                />
            </Form.Item>
        </Form>
    );
}

export default TypeSelect;
