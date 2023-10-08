import { Input } from "@nextgisweb/gui/antd";

import type { FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type InputProps = Parameters<typeof Input.TextArea>[0];

export function TextArea({ ...props }: FormItemProps<InputProps>) {
    return <FormItem {...props} input={Input.TextArea} />;
}
