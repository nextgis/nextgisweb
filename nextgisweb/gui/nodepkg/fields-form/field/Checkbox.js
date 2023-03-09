import PropTypes from "prop-types";

import { Checkbox as Checkbox_ } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

export function Checkbox({ disabled = false, ...props }) {
    return (
        <FormItem
            valuePropName="checked"
            input={(inputProps) => (
                <Checkbox_ {...{ disabled, ...inputProps }}></Checkbox_>
            )}
            {...props}
        />
    );
}

Checkbox.propTypes = {
    disabled: PropTypes.bool,
    inputProps: PropTypes.object,
};
