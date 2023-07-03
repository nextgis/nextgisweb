import { PropTypes } from "prop-types";

import { Button, Input, Select } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!pyramid";

import { FormItem } from "./_FormItem";

const languageContributeUrl = settings.language_contribute_url;
const translateProposalMsg = i18n.gettext("Improve or add new translation");

const LanguageSelectInput = ({
    value,
    onChange,
    contribute = true,
    ...selectProps
}) => {
    const defValue = "null";
    if (value === null) {
        value = defValue;
    }

    const langages = [
        {
            value: defValue,
            display_name: i18n.gettext("Browser default"),
        },
        ...settings.langages,
    ];

    const onChangeMW = (val) => {
        if (val === defValue) {
            val = null;
        }
        onChange(val);
    };

    const SelectInput = () => (
        <Select
            value={value}
            onChange={onChangeMW}
            // See https://ant.design/components/select/#FAQ
            listHeight={32 * (settings.langages.length + 1)}
            style={{ flexGrow: 1 }}
            {...selectProps}
        >
            {langages.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                    {opt.display_name}
                </Select.Option>
            ))}
        </Select>
    );

    return (
        <Input.Group compact style={{ display: "flex" }}>
            <SelectInput {...selectProps} />
            {contribute && languageContributeUrl && (
                <Button
                    type="link"
                    href={languageContributeUrl}
                    target="_blank"
                >
                    {translateProposalMsg}
                </Button>
            )}
        </Input.Group>
    );
};

LanguageSelectInput.propTypes = {
    contribute: PropTypes.bool,
    onChange: PropTypes.func,
    value: PropTypes.any,
};

export function LanguageSelect({ loading, contribute, ...props }) {
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

LanguageSelect.propTypes = {
    loading: PropTypes.bool,
    contribute: PropTypes.bool,
    inputProps: PropTypes.object,
};
