import PropTypes from "prop-types";

import { InputNumber } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

export function Number({ min, max, ...props }) {
    return (
        <FormItem
            {...props}
            input={(inputProps) => (
                <InputNumber {...{ min, max, ...inputProps }} />
            )}
        />
    );
}

Number.propTypes = {
    inputProps: PropTypes.object,
    max: PropTypes.number,
    min: PropTypes.number,
};
