import PropTypes from "prop-types";

import { DatePicker } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

export function DateTimeInput({ ...props }) {
    return (
        <FormItem
            input={(inputProps) => (
                <DatePicker showTime={true} {...inputProps} />
            )}
            {...props}
        />
    );
}

DateTimeInput.propTypes = {
    placeholder: PropTypes.string,
    inputProps: PropTypes.object,
};
