import PropTypes from "prop-types";

import { DatePicker } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

export function DateInput({ ...props }) {
    return (
        <FormItem
            input={(inputProps) => <DatePicker {...inputProps} />}
            {...props}
        />
    );
}

DateInput.propTypes = {
    placeholder: PropTypes.string,
    inputProps: PropTypes.object,
};
