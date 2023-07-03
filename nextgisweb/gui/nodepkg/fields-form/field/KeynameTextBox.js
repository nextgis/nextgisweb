import { PropTypes } from "prop-types";

import { Input } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n";

import { FormItem } from "./_FormItem";

export function KeynameTextBox({ ...props }) {
    const rules = [...props.rules] || [];
    rules.push({
        pattern: new RegExp(/^[A-Za-z][\w-]*$/g),
        message: i18n.gettext("The value entered is not valid"),
    });
    const p = { ...props, rules };
    return (
        <FormItem
            {...p}
            input={(inputProps) => <Input {...inputProps}></Input>}
        />
    );
}

KeynameTextBox.propTypes = {
    rules: PropTypes.array,
    inputProps: PropTypes.object,
};
