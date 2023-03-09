import PropTypes from "prop-types";

import { Input } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

export function TextArea({ ...props }) {
    return (
        <FormItem
            {...props}
            input={(inputProps) => <Input.TextArea {...inputProps} />}
        />
    );
}

TextArea.propTypes = {
    inputProps: PropTypes.object,
};
