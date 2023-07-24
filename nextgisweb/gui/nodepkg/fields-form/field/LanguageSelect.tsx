import { Select } from "@nextgisweb/gui/antd";

import { LanguageSelect as LanguageSelectInput } from "../../component/language-select";
import { FormItem } from "./_FormItem";

import type { LanguageSelectProps } from "../../component/language-select";
import type { FormItemProps } from "../type";

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
    ...props
}: LanguageSelectInputProps) {
    return (
        <FormItem
            {...props}
            input={(inputProps) => (
                <LanguageSelectInput
                    {...{ loading, contribute, ...inputProps }}
                />
            )}
        />
    );
}
