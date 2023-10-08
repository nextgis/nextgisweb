import { Button, Select, Space } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!pyramid";

type InputProps = Parameters<typeof Select>[0];

export interface LanguageSelectProps extends InputProps {
    /** Add  proposal to contribute to the translation  */
    contribute?: boolean;
    // value: string;
    // onChange: (val: string) => void;
}

const languageContributeUrl = settings.language_contribute_url;
const msgImprove = gettext("Improve or add new translation");

export const LanguageSelect = ({
    value,
    onChange,
    contribute = true,
    ...selectProps
}: LanguageSelectProps) => {
    const defValue = "null";
    if (value === null) {
        value = defValue;
    }

    const languages = [
        {
            value: defValue,
            display_name: gettext("Browser default"),
        },
        ...settings.languages,
    ];

    const SelectInput = () => (
        <Select
            value={value}
            onChange={(val, opt) => {
                if (val === defValue) {
                    val = null;
                }
                if (onChange) {
                    onChange(val, opt);
                }
            }}
            // See https://ant.design/components/select/#FAQ
            listHeight={32 * (settings.languages.length + 1)}
            style={{ flexGrow: 1 }}
            {...selectProps}
        >
            {languages.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                    {opt.display_name}
                </Select.Option>
            ))}
        </Select>
    );

    return (
        <Space.Compact style={{ display: "flex" }}>
            <SelectInput />
            {contribute && languageContributeUrl && (
                <Button
                    type="link"
                    href={languageContributeUrl}
                    target="_blank"
                >
                    {msgImprove}
                </Button>
            )}
        </Space.Compact>
    );
};
