import { Button, Flex, Select } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";
import settings from "@nextgisweb/pyramid/client-settings";
import { gettext } from "@nextgisweb/pyramid/i18n";

export interface LanguageSelectProps extends SelectProps {
    /** Add proposal to contribute to the translation  */
    contribute?: boolean;
}

const { contributeUrl, languages } = settings.i18n;
const nullOption = "NULL";

const msgImprove = gettext("Improve or add new translation");

const options = [
    { value: nullOption, label: gettext("Browser default") },
    ...languages.map(({ code, endonym }) => ({ value: code, label: endonym })),
];

export function LanguageSelect({
    value,
    onChange,
    contribute = true,
    ...selectProps
}: LanguageSelectProps) {
    return (
        <Flex gap="middle">
            <Select
                style={{ flexGrow: 1 }}
                value={value ?? nullOption}
                options={options}
                // See https://ant.design/components/select/#FAQ
                listHeight={32 * (languages.length + 1)}
                onChange={(val, opt) => {
                    if (val === nullOption) val = null;
                    onChange?.(val, opt);
                }}
                {...selectProps}
            />
            {contribute && contributeUrl && (
                <Button type="default" href={contributeUrl} target="_blank">
                    {msgImprove}
                </Button>
            )}
        </Flex>
    );
}
