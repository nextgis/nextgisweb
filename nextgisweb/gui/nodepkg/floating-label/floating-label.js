import React, { useState } from "react";

import "./floating-label.less";

export const FloatingLabel = (props) => {
    const [focus, setFocus] = useState(false);
    const { children, label, value } = props;

    const classLabel =
        focus || (value && value.length !== 0) ? "label float" : "label";

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
};
