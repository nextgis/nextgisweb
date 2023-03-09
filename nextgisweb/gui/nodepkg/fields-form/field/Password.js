import PropTypes from "prop-types";

import { Input } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

export function Password({ autoComplete, placeholder, ...props }) {

    return (
        <FormItem
            {...props}
            input={(inputProps) => <Input.Password {...{autoComplete, placeholder,...inputProps}} />}
        />
    );
}

Password.propTypes = {
    autoComplete: PropTypes.string,
    placeholder: PropTypes.string,
    inputProps: PropTypes.object,
};
