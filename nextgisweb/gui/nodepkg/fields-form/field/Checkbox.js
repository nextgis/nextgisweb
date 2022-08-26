import PropTypes from "prop-types";
import { Form, Checkbox as CB } from "@nextgisweb/gui/antd";

export function Checkbox({ disabled = false, ...props }) {
    return (
        <Form.Item {...props} valuePropName="checked">
            <CB {...{ disabled }}></CB>
        </Form.Item>
    );
}

Checkbox.propTypes = {
    disabled: PropTypes.bool,
};
