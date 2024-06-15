import { useMemo } from "react";

import type { ResourceRef } from "@nextgisweb/resource/type/api";

import { ResourceSelect } from "./ResourceSelect";
import type { ResourceSelectProps } from "./type";

export interface ResourceSelectRefProps
    extends Omit<ResourceSelectProps<number>, "value" | "onChange"> {
    value?: ResourceRef | null;
    onChange?: (value: ResourceRef | null) => void;
    multiple?: false;
}

export function ResourceSelectRef({
    value,
    onChange,
    ...restProps
}: ResourceSelectRefProps) {
    const valueMemo = useMemo(
        () => (value !== null ? value?.id : undefined),
        [value]
    );

    const onChangeMemo = useMemo(() => {
        if (onChange === undefined) return undefined;
        return (value: number | undefined) => {
            onChange?.(value !== undefined ? { id: value } : null);
        };
    }, [onChange]);

    return (
        <ResourceSelect
            value={valueMemo}
            onChange={onChangeMemo}
            {...restProps}
        />
    );
}
