import type { FormItemProps } from "@nextgisweb/gui/fields-form";
import { FormItem } from "@nextgisweb/gui/fields-form/field/_FormItem";

import { ColorInput } from "./ColorInput";
import type { ColorInputProps } from "./ColorInput";

type ColorProps = FormItemProps<ColorInputProps>;

export function ColorField(props: ColorProps) {
    return <FormItem {...props} input={ColorInput} />;
}
