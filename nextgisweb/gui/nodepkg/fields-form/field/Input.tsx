import { Input as Input_ } from "@nextgisweb/gui/antd";

import type { FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type InputProps = Parameters<typeof Input_>[0];

export function Input(props: FormItemProps<InputProps>) {
    return <FormItem {...props} input={Input_} />;
}
