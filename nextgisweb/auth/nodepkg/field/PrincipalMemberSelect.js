import { Form, Select } from "@nextgisweb/gui/antd";
import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";

export function PrincipalMemberSelect(props) {
    const { choices, ...formItemProps } = props;
    const [groups, setGroups] = useState(null);
    useEffect(async () => {
        if (Array.isArray(choices)) {
            setGroups(choices);
        } else if (typeof choices === "function") {
            const groups_ = await choices();
            setGroups(groups_);
        }
    }, []);

    return (
        <Form.Item {...formItemProps}>
            <Select mode="multiple" loading={!groups}>
                {groups && groups.map(({ id, display_name }) => (
                    <Select.Option key={id} value={id}>
                        {display_name}
                    </Select.Option>
                ))}
            </Select>
        </Form.Item>
    );
}

PrincipalMemberSelect.propTypes = {
    choices: PropTypes.oneOfType([PropTypes.array, PropTypes.func]),
};
