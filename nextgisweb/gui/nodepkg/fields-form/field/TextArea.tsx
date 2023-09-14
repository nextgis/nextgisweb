import { Input } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

import type { FormItemProps } from "../type";

type InputProps = Parameters<typeof Input.TextArea>[0];

export function TextArea({ ...props }: FormItemProps<InputProps>) {
    return <FormItem {...props} input={Input.TextArea} />;
}
