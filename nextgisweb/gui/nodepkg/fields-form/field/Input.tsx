import { Input as Input_ } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

import type { FormItemProps } from "../type";

type InputProps = Parameters<typeof Input_>[0];

export function Input(props: FormItemProps<InputProps>) {
    return <FormItem {...props} input={Input_} />;
}
