import PropTypes from "prop-types";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Select } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";

import { showResourcePicker } from "../resource-picker";
import { renderResourceCls } from "../resource-picker/util/renderResourceCls";

import "./ResourceSelect.less";

export const ResourceSelect = ({
    value,
    onChange,
    pickerOptions,
    ...selectOptions
}) => {
    const pickerModal = useRef();

    const { makeSignal, abort } = useAbortController();
    const [value_, setValue_] = useState(value);
    const [open, setOpen] = useState(false);
    const [resource, setResource] = useState(null);
    const [resourceLoading, setResourceLoading] = useState(false);

    const closePicker = () => {
        if (pickerModal.current) {
            pickerModal.current;
        }
    };

    const loadResource = useCallback(async () => {
        abort();
        if (typeof value_ === "number") {
            try {
                setResourceLoading(true);
                const res = await route("resource.item", value_).get({
                    cache: true,
                    signal: makeSignal(),
                });
                setResource(res);
            } finally {
                setResourceLoading(false);
            }
        }
    }, [value_, abort, makeSignal]);

    const onPick = useCallback(
        (val) => {
            setValue_(val);
            setOpen(false);
            if (onChange) {
                onChange(val);
            }
            closePicker();
        },
        [onChange]
    );

    useEffect(() => {
        setValue_(value);
    }, [value]);

    useEffect(() => {
        if (open) {
            const pickerOptions_ = {
                ...pickerOptions,
                selected: [value_].filter((v) => typeof v === "number"),
            };
            pickerModal.current = showResourcePicker({
                pickerOptions: pickerOptions_,
                onSelect: onPick,
            });
        }
        return closePicker;
    }, [onPick, open, pickerOptions, value_]);

    useEffect(() => {
        if (value_ !== undefined) {
            loadResource();
        }
    }, [value_, loadResource]);

    const options = useMemo(() => {
        return resource
            ? [
                {
                    label: resource.resource.display_name,
                    value: resource.resource.id,
                    cls: resource.resource.cls,
                },
            ]
            : [];
    }, [resource]);

    const optionRender = ({ label, cls }) => {
        return renderResourceCls({ name: label, cls });
    };

    return (
        <Select
            open={open}
            value={value_}
            loading={resourceLoading}
            onDropdownVisibleChange={(visible) => setOpen(visible)}
            popupClassName="ngw-resource-resource-select-hidden-dropdown"
            dropdownRender={() => <></>}
            onClear={() => {
                onPick(null);
            }}
            {...selectOptions}
        >
            {options.map(({ label, value, cls }) => {
                return (
                    <Select.Option key={value} value={value} label={label}>
                        {optionRender({ label, cls })}
                    </Select.Option>
                );
            })}
        </Select>
    );
};

ResourceSelect.propTypes = {
    pickerOptions: PropTypes.object,
    onChange: PropTypes.func,
    value: PropTypes.any,
};
