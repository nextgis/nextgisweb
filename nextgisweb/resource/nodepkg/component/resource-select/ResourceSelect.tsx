import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Select, Space } from "@nextgisweb/gui/antd";
import { OpenInNewIcon } from "@nextgisweb/gui/icon";
import { routeURL } from "@nextgisweb/pyramid/api";
import { ResourceIcon } from "@nextgisweb/resource/icon";

import { showResourcePicker } from "../resource-picker";
import type { ResourcePickerStoreOptions } from "../resource-picker/type";

import { useResourceSelect } from "./hook/useResourceSelect";
import type { ResourceSelectOption, ResourceSelectProps } from "./type";

export function ResourceSelect<V extends number = number>({
    value,
    onChange,
    readOnly,
    hideGoto,
    pickerOptions,
    allowClear,
    style,
    ...selectOptions
}: ResourceSelectProps<V>) {
    const pickerModal = useRef<ReturnType<typeof showResourcePicker<V>>>();

    const [value_, setValue_] = useState<V | undefined>(value);
    const [open, setOpen] = useState(false);
    const pickerParentIdMem = useRef<number | undefined>(
        pickerOptions ? pickerOptions.parentId : undefined
    );
    const { resource, isLoading: resourceLoading } = useResourceSelect({
        value: value_,
    });

    const onPick = useCallback(
        (val: V | undefined) => {
            setValue_(val);
            setOpen(false);
            onChange?.(val);
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
                .filter((v) => typeof v === "number") as number[];
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
                onSelect: (v) => {
                    if (v !== undefined) {
                        onPick(v);
                    }
                },
            });
        }
        // TODO: Suspcious, pickerOptions and onChange (onPick dependency) may
        // not be memoized and picker willbe reopended eache rendering cycle.
        return () => setOpen(false);
    }, [onPick, open, pickerOptions, value_]);

    const options = useMemo<ResourceSelectOption[]>(() => {
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

    const optionRender = useCallback(
        ({ label, cls, value }: ResourceSelectOption) => (
            <Space>
                <ResourceIcon identity={cls} />
                {label}
                {!hideGoto && (
                    <a
                        href={routeURL("resource.show", value)}
                        target="_blank"
                        onMouseDown={(evt) => {
                            // Prevent from opening picker
                            evt.stopPropagation();
                        }}
                    >
                        <OpenInNewIcon />
                    </a>
                )}
            </Space>
        ),
        [hideGoto]
    );

    return (
        <Select
            open={open}
            value={value_}
            loading={resourceLoading}
            onDropdownVisibleChange={(visible) => {
                if (!visible || !readOnly) {
                    setOpen(visible);
                }
            }}
            suffixIcon={readOnly ? <></> : undefined}
            dropdownRender={() => <></>}
            onClear={() => {
                onPick(undefined);
            }}
            allowClear={!readOnly && allowClear}
            style={{ cursor: readOnly ? "unset" : undefined, ...(style || {}) }}
            {...selectOptions}
        >
            {options.map(({ label, value, cls }) => {
                return (
                    <Select.Option key={value} value={value} label={label}>
                        {optionRender({ label, cls, value })}
                    </Select.Option>
                );
            })}
        </Select>
    );
}
