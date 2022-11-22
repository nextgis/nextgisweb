import PropTypes from "prop-types";
import { Form, InputNumber } from "@nextgisweb/gui/antd";

export function Number({ min, max, inputProps, ...props }) {
    const inputProps_ = { ...inputProps, min, max };

    return (
        <Form.Item {...props}>
            <InputNumber {...inputProps_} />
        </Form.Item>
    );
}

Number.propTypes = {
    inputProps: PropTypes.object,
    max: PropTypes.number,
    min: PropTypes.number,
};
