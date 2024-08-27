import { useCallback } from "react";

import type { ResourcePickerStore } from "../store/ResourcePickerStore";
import type { PickerResource, RowSelection } from "../type";

type CheckboxProps = ReturnType<NonNullable<RowSelection["getCheckboxProps"]>>

interface UsePickerCardProps {
    resourceStore: ResourcePickerStore;
}

function usePickerCard({ resourceStore }: UsePickerCardProps) {
    const { checkEnabled, disableResourceIds } = resourceStore;

    const getEnabledProps = useCallback(
        (record: PickerResource, checks: Record<string, () => boolean>[]) => {
            const props: CheckboxProps = { disabled: false };

            const disableChecker = [
                {
                    check: () => Array.isArray(disableResourceIds),
                    isDisabled: () => disableResourceIds.includes(record.id),
                },
                ...checks,
            ];
            props.disabled = disableChecker.some((check) => {
                const ok = check.check ? check.check() : true;
                if (ok) {
                    return check.isDisabled();
                }
                return true;
            });

            return props;
        },
        [disableResourceIds]
    );

    const getCheckboxProps: RowSelection["getCheckboxProps"] = useCallback(
        (record: PickerResource) =>
            getEnabledProps(record, [
                {
                    isDisabled: () => !checkEnabled(record),
                },
            ]),

        [checkEnabled, getEnabledProps]
    );

    return { getCheckboxProps, getEnabledProps };
}

export default usePickerCard;
