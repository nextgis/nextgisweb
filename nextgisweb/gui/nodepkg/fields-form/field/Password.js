import PropTypes from "prop-types";
import { Form, Input } from "@nextgisweb/gui/antd";

export function Password({ autoComplete, placeholder, ...props }) {
    const inputProps = { autoComplete, placeholder };

    return (
        <Form.Item {...props}>
            <Input.Password {...inputProps} />
        </Form.Item>
    );
}

Password.propTypes = {
    autoComplete: PropTypes.string,
    placeholder: PropTypes.string,
};
