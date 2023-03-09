import PropTypes from "prop-types";

import { Input as Input_ } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

export function Input(props) {
    return (
        <FormItem
            {...props}
            input={(inputProps) => <Input_ {...inputProps} />}
        />
    );
}

Input.propTypes = {
    placeholder: PropTypes.string,
    inputProps: PropTypes.object,
    label: PropTypes.string,
};
