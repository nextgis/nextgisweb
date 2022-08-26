import { PropTypes } from "prop-types";
import { Form, Input } from "@nextgisweb/gui/antd";

export function ValidationTextBox(props) {
    const { disabled, ...formProps } = props;
    const inputProps = { disabled };
    return (
        <Form.Item {...formProps}>
            <Input {...inputProps} />
        </Form.Item>
    );
}

ValidationTextBox.propTypes = {
    disabled: PropTypes.boolean,
};
