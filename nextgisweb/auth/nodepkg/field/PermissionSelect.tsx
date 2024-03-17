import { Form } from "@nextgisweb/gui/antd";
import type { FormItemProps } from "@nextgisweb/gui/fields-form/type";
import type { ParamsOf } from "@nextgisweb/gui/type";

import { PermissionSelect as Component } from "../component";

export function PermissionSelect(
    props: FormItemProps<ParamsOf<typeof Component>>
) {
    const { inputProps, ...formItemProps } = props;

    return (
        <Form.Item {...formItemProps}>
            <Component {...inputProps} />
        </Form.Item>
    );
}
