import { Form, Select } from "@nextgisweb/gui/antd";
import settings from "@nextgisweb/pyramid/settings!pyramid";
import i18n from "@nextgisweb/pyramid/i18n!gui";

export function LanguageSelect({ loading, ...props }) {
    const langages = [
        {
            value: null,
            display_name: i18n.gettext("Browser default"),
        },
        ...settings.langages,
    ];
    const selectProps = { loading };
    return (
        <Form.Item {...props}>
            <Select
                // See https://ant.design/components/select/#FAQ
                listHeight={32 * (settings.langages.length + 1)}
                {...selectProps}
            >
                {langages.map(({ value, display_name }) => (
                    <Select.Option key={value} value={value}>
                        {display_name}
                    </Select.Option>
                ))}
            </Select>
        </Form.Item>
    );
}
