import { useCallback, useMemo } from "react";

import { Select } from "@nextgisweb/gui/antd";
import type { OptionType, SelectProps } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import type { SRSRead } from "@nextgisweb/spatial-ref-sys/type/api";

const srsListToOptions = (srsList: SRSRead[]) => {
    return srsList.map((srs: SRSRead) => {
        return {
            label: srs.display_name,
            value: srs.id,
        };
    });
};

export const SrsSelect = ({
    value,
    onChange,
    ...restProps
}: SelectProps<number>) => {
    const { data: srsInfo, isLoading } = useRouteGet(
        "spatial_ref_sys.collection"
    );

    const srsOptions = useMemo<OptionType[] | undefined>(
        () => (srsInfo ? srsListToOptions(srsInfo) : undefined),
        [srsInfo]
    );

    const onChangeSelect = useCallback(
        (value: number, type?: OptionType | OptionType[]) => {
            if (onChange) {
                onChange(value, type);
            }
        },
        [onChange]
    );

    return (
        <Select
            disabled={isLoading}
            options={srsOptions}
            value={value}
            onChange={onChangeSelect}
            {...restProps}
        ></Select>
    );
};
