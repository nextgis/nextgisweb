import { Form, Select, Tag } from "@nextgisweb/gui/antd";
import { PropTypes } from "prop-types";
import { useEffect, useState, useMemo } from "react";

export function PrincipalMemberSelect(props) {
    const { choices, memberHref, ...formItemProps } = props;
    const [groups, setGroups] = useState(null);
    useEffect(async () => {
        if (Array.isArray(choices)) {
            setGroups(choices);
        } else if (typeof choices === "function") {
            const groups_ = await choices();
            setGroups(groups_);
        }
    }, []);

    const options = useMemo(() => {
        return groups
            ? groups.map(({ display_name, id }) => ({
                label: display_name,
                value: id,
            }))
            : [];
    }, [groups]);

    const tagRender = (tagProps) => {
        const { label, closable, onClose, value } = tagProps;
        const onPreventMouseDown = (event) => {
            event.preventDefault();
            event.stopPropagation();
        };
        return (
            <Tag
                onMouseDown={onPreventMouseDown}
                closable={closable}
                onClose={onClose}
                style={{ marginRight: 3 }}
            >
                {memberHref ? (
                    <a
                        href={memberHref(value)}
                        style={{ textDecoration: "none" }}
                        target="_blank"
                    >
                        {label}
                    </a>
                ) : (
                    label
                )}
            </Tag>
        );
    };

    return (
        <Form.Item {...formItemProps}>
            <Select
                mode="multiple"
                optionFilterProp="label"
                loading={!groups}
                options={options}
                allowClear
                tagRender={tagRender}
            />
        </Form.Item>
    );
}

PrincipalMemberSelect.propTypes = {
    choices: PropTypes.oneOfType([PropTypes.array, PropTypes.func]),
    memberHref: PropTypes.func,
};
