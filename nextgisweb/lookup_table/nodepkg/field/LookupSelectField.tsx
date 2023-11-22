import { Form } from "@nextgisweb/gui/antd";
import type { FormItemProps } from "@nextgisweb/gui/fields-form";

import { LookupSelect } from "../component/lookup-select";
import type { LookupSelectProps } from "../component/lookup-select";

export function LookupSelectField(props: FormItemProps<LookupSelectProps>) {
    const { inputProps, ...formItemProps } = props;
    const { lookupId } = inputProps || {};
    if (!lookupId) {
        return <>ERROR</>;
    }
    return (
        <Form.Item {...formItemProps}>
            <LookupSelect lookupId={lookupId} {...inputProps} />
        </Form.Item>
    );
}
