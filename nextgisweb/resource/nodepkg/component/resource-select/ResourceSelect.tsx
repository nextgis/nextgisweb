import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Select } from "@nextgisweb/gui/antd";
import { routeURL } from "@nextgisweb/pyramid/api";

import type { ResourceClass } from "../../type";
import { renderResourceCls } from "../../util/renderResourceCls";
import { showResourcePicker } from "../resource-picker";
import type {
    ResourcePickerStoreOptions,
    SelectValue,
} from "../resource-picker/type";

import { useResourceSelect } from "./hook/useResourceSelect";
import type { ResourceSelectProps } from "./type";

import "./ResourceSelect.less";

interface Option {
    label: React.ReactNode;
    value: number;
    cls: ResourceClass;
}

export const ResourceSelect = <V extends SelectValue = SelectValue>({
    value,
    onChange,
    readOnly,
    pickerOptions,
    ...selectOptions
}: ResourceSelectProps<V>) => {
    const pickerModal = useRef<ReturnType<typeof showResourcePicker<V>>>();

    const [value_, setValue_] = useState<V | undefined>(value);
    const [open, setOpen] = useState(false);
    const pickerParentIdMem = useRef<number | undefined>(
        pickerOptions ? pickerOptions.parentId : undefined
    );
    const { resource, isLoading: resourceLoading } = useResourceSelect({
        value: value_,
    });

    const closePicker = () => {
        if (pickerModal.current) {
            pickerModal.current;
        }
    };

    const onPick = useCallback(
        (val: V | undefined) => {
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
        return closePicker;
    }, [onPick, open, pickerOptions, value_]);

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

    const optionRender = ({ label, cls }: Pick<Option, "label" | "cls">) => {
        return renderResourceCls({ name: label, cls });
    };

    return (
        <>
            {readOnly ? (
                options.map(({ label, value, cls }) => {
                    const Label = (
                        <a
                            href={routeURL("resource.show", { id: value })}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {label}
                        </a>
                    );
                    return (
                        <div key={value}>
                            {optionRender({ label: Label, cls })}
                        </div>
                    );
                })
            ) : (
                <Select
                    open={open}
                    value={value_}
                    loading={resourceLoading}
                    onDropdownVisibleChange={(visible) => setOpen(visible)}
                    popupClassName="ngw-resource-resource-select-hidden-dropdown"
                    dropdownRender={() => <></>}
                    onClear={() => {
                        onPick(undefined);
                    }}
                    {...selectOptions}
                >
                    {options.map(({ label, value, cls }) => {
                        return (
                            <Select.Option
                                key={value}
                                value={value}
                                label={label}
                            >
                                {optionRender({ label, cls })}
                            </Select.Option>
                        );
                    })}
                </Select>
            )}
        </>
    );
};
