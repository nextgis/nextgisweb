import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Select } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";

import { showResourcePicker } from "../resource-picker";
import { renderResourceCls } from "../resource-picker/util/renderResourceCls";

import type { ResourceItem, ResourceClass } from "../../type";
import type {
    ResourcePickerStoreOptions,
    SelectValue,
} from "../resource-picker/type";
import type { ResourceSelectProps } from "./type";

import "./ResourceSelect.less";

interface Option {
    label: string;
    value: number;
    cls: ResourceClass;
}

export const ResourceSelect = ({
    value,
    onChange,
    pickerOptions,
    ...selectOptions
}: ResourceSelectProps) => {
    const pickerModal = useRef<ReturnType<typeof showResourcePicker>>();

    const { makeSignal, abort } = useAbortController();
    const [value_, setValue_] = useState(value);
    const [open, setOpen] = useState(false);
    const pickerParentIdMem = useRef<number | null>(null);
    const [resource, setResource] = useState<ResourceItem | null>(null);
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
        (val: SelectValue) => {
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
            const selected: number[] = [value_]
                .flat()
                .filter((v) => typeof v === "number");
            const pickerOptions_: ResourcePickerStoreOptions = {
                parentId: pickerParentIdMem.current,
                ...pickerOptions,
                selected,
                onTraverse: (val) => {
                    pickerParentIdMem.current = val;
                },
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

    const options = useMemo<Option[]>(() => {
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
