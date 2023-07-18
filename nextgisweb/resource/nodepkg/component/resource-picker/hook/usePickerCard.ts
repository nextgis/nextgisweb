import { useCallback } from "react";

import type { Resource } from "../../../type/Resource";
import type { ResourcePickerStore } from "../store/ResourcePickerStore";

interface UsePickerCardProps {
    resourceStore: ResourcePickerStore;
}

const usePickerCard = ({ resourceStore }: UsePickerCardProps) => {
    const { checkEnabled, disableResourceIds } = resourceStore;

    const getEnabledProps = useCallback(
        (record, checks) => {
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

    const getCheckboxProps = useCallback(
        (record: Resource) => {
            return getEnabledProps(record, [
                {
                    isDisabled: () => !checkEnabled.call(resourceStore, record),
                },
            ]);
        },
        [checkEnabled, getEnabledProps, resourceStore]
    );

    return { getCheckboxProps, getEnabledProps };
};

export default usePickerCard;
