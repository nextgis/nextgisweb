import { PropTypes } from "prop-types";

import { Form } from "@nextgisweb/gui/antd";
import { PrincipalSelect as Component } from "../component";

export function PrincipalSelect(props) {
    const { inputProps, ...formItemProps } = props;

    return (
        <Form.Item {...formItemProps}>
            <Component {...inputProps} />
        </Form.Item>
    );
}

PrincipalSelect.propTypes = {
    inputProps: PropTypes.object,
    systemUsers: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.arrayOf(PropTypes.string),
    ]),
};
