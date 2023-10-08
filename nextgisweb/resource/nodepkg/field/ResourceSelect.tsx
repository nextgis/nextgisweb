import { Form } from "@nextgisweb/gui/antd";
import type { FormItemProps } from "@nextgisweb/gui/fields-form";

import { ResourceSelect as SelectInput } from "../component/resource-select";
import type { ResourceSelectProps } from "../component/resource-select/type";

export function ResourceSelect({
    inputProps,
    ...props
}: FormItemProps<ResourceSelectProps<number>>) {
    return (
        <Form.Item {...props}>
            <SelectInput {...inputProps}></SelectInput>
        </Form.Item>
    );
}
