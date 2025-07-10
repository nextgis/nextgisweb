import { useCallback, useEffect, useMemo, useState } from "react";

import { useShowModal } from "@nextgisweb/gui";
import { Select, Space } from "@nextgisweb/gui/antd";
import { useObjectState } from "@nextgisweb/gui/hook";
import { OpenInNewIcon } from "@nextgisweb/gui/icon";
import { routeURL } from "@nextgisweb/pyramid/api";
import { ResourceIcon } from "@nextgisweb/resource/icon";

import { useResourcePicker } from "../resource-picker/hook";
import type { ResourcePickerStoreOptions } from "../resource-picker/type";

import { useResourceSelect } from "./hook/useResourceSelect";
import type { ResourceSelectOption, ResourceSelectProps } from "./type";

export function ResourceSelect<V extends number = number>({
    style,
    value: valueProp,
    onChange,
    readOnly,
    hideGoto,
    allowClear,
    pickerOptions: pickerOptionsProp,
    ...selectOptions
}: ResourceSelectProps<V>) {
    const [value, setValue] = useState<V | undefined>(valueProp);
    const { modalHolder, modalStore } = useShowModal();
    const [open, setOpen] = useState(false);
    const { showResourcePicker } = useResourcePicker({
        modalStore,
        initParentId:
            pickerOptionsProp?.initParentId || pickerOptionsProp?.parentId,
    });

    const [pickerOptions] = useObjectState(pickerOptionsProp);

    const { resource, isLoading: resourceLoading } = useResourceSelect({
        value,
    });

    const onPick = useCallback(
        (val: V | undefined) => {
            setValue(val);
            setOpen(false);
            onChange?.(val);
        },
        [onChange]
    );

    useEffect(() => {
        setValue(valueProp);
    }, [valueProp]);

    useEffect(() => {
        if (open) {
            const selected: number[] = [value]
                .flat()
                .filter((v) => typeof v === "number") as number[];
            const pickerOptions_: ResourcePickerStoreOptions = {
                ...pickerOptions,
                selected,
            };
            showResourcePicker<V>({
                pickerOptions: pickerOptions_,
                onSelect: (v) => {
                    if (v !== undefined) {
                        onPick(v);
                    }
                },
            });
        }
        return () => setOpen(false);
    }, [onPick, open, pickerOptions, showResourcePicker, value]);

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
        <>
            {modalHolder}
            <Select
                open={open}
                value={value}
                loading={resourceLoading}
                onOpenChange={(visible) => {
                    if (!visible || !readOnly) {
                        setOpen(visible);
                    }
                }}
                suffixIcon={readOnly ? <></> : undefined}
                popupRender={() => <></>}
                onClear={() => {
                    onPick(undefined);
                }}
                allowClear={!readOnly && allowClear}
                style={{
                    cursor: readOnly ? "unset" : undefined,
                    ...(style || {}),
                }}
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
        </>
    );
}
