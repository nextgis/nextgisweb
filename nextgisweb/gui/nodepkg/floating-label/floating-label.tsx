import { useState } from "react";
import type { ReactElement } from "react";

import "./floating-label.less";

type FloatingLabelProps = {
    children: ReactElement;
    label: string;
    value?: string;
};

export function FloatingLabel({ children, label, value }: FloatingLabelProps) {
    const [focus, setFocus] = useState(false);

    const classLabel =
        focus || (value !== undefined && value.length !== 0)
            ? "label float"
            : "label";

    return (
        <div
            className="float-label"
            onBlur={() => setFocus(false)}
            onFocus={() => setFocus(true)}
        >
            {children}
            <label className={classLabel}>{label}</label>
        </div>
    );
}
