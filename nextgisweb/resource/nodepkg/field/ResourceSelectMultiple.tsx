import { Form } from "@nextgisweb/gui/antd";
import { ResourceSelectMultiple as SelectInput } from "../component/resource-select";

import type { FormItemProps } from "@nextgisweb/gui/fields-form";
import type { ResourceSelectProps } from "../component/resource-select/type";

type ResourceSelectMultipleProps = FormItemProps<ResourceSelectProps<number[]>>;

export function ResourceSelectMultiple({
    inputProps = {},
    ...props
}: ResourceSelectMultipleProps) {
    return (
        <Form.Item {...props}>
            <SelectInput {...inputProps}></SelectInput>
        </Form.Item>
    );
}
