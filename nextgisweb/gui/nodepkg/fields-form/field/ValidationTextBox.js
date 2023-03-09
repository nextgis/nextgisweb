import { PropTypes } from "prop-types";

import { Input } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

export function ValidationTextBox({ ...props }) {
    return (
        <FormItem
            {...props}
            input={(inputProps) => <Input {...inputProps} />}
        />
    );
}

ValidationTextBox.propTypes = {
    disabled: PropTypes.boolean,
    inputProps: PropTypes.object,
};
