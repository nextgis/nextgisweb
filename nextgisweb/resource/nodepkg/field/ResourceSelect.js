import PropTypes from "prop-types";

import { Form } from "@nextgisweb/gui/antd";
import { ResourceSelect as SelectInput } from "../component/resource-select";

export function ResourceSelect({ inputProps, ...props }) {
    return (
        <Form.Item {...props}>
            <SelectInput {...inputProps}></SelectInput>
        </Form.Item>
    );
}

ResourceSelect.propTypes = {
    inputProps: PropTypes.object,
};
