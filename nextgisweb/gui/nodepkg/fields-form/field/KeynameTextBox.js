import { PropTypes } from "prop-types";
import { Form, Input } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!";

export function KeynameTextBox(props) {
    const rules = [...props.rules] || [];
    rules.push({
        pattern: new RegExp(/^[A-Za-z][\w-]*$/g),
        message: i18n.gettext("The value entered is not valid"),
    });
    const p = { ...props, rules };
    return (
        <Form.Item {...p}>
            <Input></Input>
        </Form.Item>
    );

}

KeynameTextBox.propTypes = {
    rules: PropTypes.array,
};
