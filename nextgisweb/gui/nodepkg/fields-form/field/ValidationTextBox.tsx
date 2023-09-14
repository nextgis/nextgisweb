import { Input } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

import type { FormItemProps } from "../type";

type InputProps = Parameters<typeof Input>[0];

export function ValidationTextBox({ ...props }: FormItemProps<InputProps>) {
    return <FormItem {...props} input={Input} />;
}
