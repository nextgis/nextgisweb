import type { Select } from "@nextgisweb/gui/antd";

import { LanguageSelect as LanguageSelectInput } from "../../component/language-select";
import type { LanguageSelectProps } from "../../component/language-select";
import type { FormItemProps } from "../type";

import { FormItem } from "./_FormItem";

type InputProps = Parameters<typeof Select>[0];

type LanguageSelectInputProps = FormItemProps<LanguageSelectProps> & {
    /** @deprecated move to inputProps */
    loading?: InputProps["loading"];
    /** @deprecated move to inputProps */
    contribute?: LanguageSelectProps["contribute"];
};

export function LanguageSelect({
    loading,
    contribute,
    inputProps,
    ...props
}: LanguageSelectInputProps) {
    inputProps = inputProps ?? {};
    inputProps = { loading, contribute, ...inputProps };
    return (
        <FormItem
            inputProps={inputProps}
            {...props}
            input={LanguageSelectInput}
        />
    );
}
