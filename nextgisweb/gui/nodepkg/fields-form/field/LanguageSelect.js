import { Form, Select } from "@nextgisweb/gui/antd";
import settings from "@nextgisweb/pyramid/settings!pyramid";
import i18n from "@nextgisweb/pyramid/i18n!gui";

export function LanguageSelect(props) {
    const langages = [
        {
            value: null,
            display_name: i18n.gettext("Browser default"),
        },
        ...settings.langages,
    ];
    return (
        <Form.Item {...props}>
            <Select>
                {langages.map(({ value, display_name }) => (
                    <Select.Option key={value} value={value}>
                        {display_name}
                    </Select.Option>
                ))}
            </Select>
        </Form.Item>
    );
}
