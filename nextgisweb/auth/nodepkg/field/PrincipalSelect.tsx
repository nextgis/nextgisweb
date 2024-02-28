import { Form } from "@nextgisweb/gui/antd";
import type { FormItemProps } from "@nextgisweb/gui/fields-form/type";

import { PrincipalSelect as Component } from "../component";
import type { PrincipalSelectProps } from "../component/principal-select/type";

export function PrincipalSelect(props: FormItemProps<PrincipalSelectProps>) {
    const { inputProps, ...formItemProps } = props;

    return (
        <Form.Item {...formItemProps}>
            <Component {...inputProps} />
        </Form.Item>
    );
}
