import PropTypes from "prop-types";

import { Form } from "@nextgisweb/gui/antd";
import { ResourceSelectMultiple as SelectInput } from "../component/resource-select";

export function ResourceSelectMultiple({ inputProps = {}, ...props }) {
    return (
        <Form.Item {...props}>
            <SelectInput {...inputProps}></SelectInput>
        </Form.Item>
    );
}

ResourceSelectMultiple.propTypes = {
    inputProps: PropTypes.object,
};
