import PropTypes from "prop-types";

import { Select as AntdSelect } from "@nextgisweb/gui/antd";

import { FormItem } from "./_FormItem";

export function Select({ choices, mode, ...props }) {
    return (
        <FormItem
            {...props}
            input={(inputProps) => (
                <AntdSelect {...{ mode, ...inputProps }}>
                    {choices.map(({ label, value, ...optionProps }) => (
                        <AntdSelect.Option
                            key={value}
                            value={value}
                            {...optionProps}
                        >
                            {label}
                        </AntdSelect.Option>
                    ))}
                </AntdSelect>
            )}
        />
    );
}

Select.propTypes = {
    choices: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
                .isRequired,
        })
    ),
    mode: PropTypes.string,
    inputProps: PropTypes.object,
};
