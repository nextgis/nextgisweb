import { useCallback } from "react";

import type { ResourcePickerStore } from "../store/ResourcePickerStore";
import type { PickerResource, RowSelection } from "../type";

type GetCheckboxProps = NonNullable<RowSelection["getCheckboxProps"]>;

interface UsePickerCardProps {
    resourceStore: ResourcePickerStore;
}

const usePickerCard = ({ resourceStore }: UsePickerCardProps) => {
    const { checkEnabled, disableResourceIds } = resourceStore;

    const getEnabledProps = useCallback(
        (record: PickerResource, checks: Record<string, () => boolean>[]) => {
            const props = { disabled: false };

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

    const getCheckboxProps = useCallback<GetCheckboxProps>(
        (record) => {
            return getEnabledProps(record as PickerResource, [
                {
                    isDisabled: () => !checkEnabled(record as PickerResource),
                },
            ]);
        },
        [checkEnabled, getEnabledProps]
    );

    return { getCheckboxProps, getEnabledProps };
};

export default usePickerCard;
