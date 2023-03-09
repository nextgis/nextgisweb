import PropTypes from "prop-types";

import { TimePicker } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

export function TimeInput({ ...props }) {
    return (
        <FormItem
            {...props}
            input={(inputProps) => <TimePicker {...inputProps} />}
        />
    );
}

TimeInput.propTypes = {
    placeholder: PropTypes.string,
    inputProps: PropTypes.object,
};
