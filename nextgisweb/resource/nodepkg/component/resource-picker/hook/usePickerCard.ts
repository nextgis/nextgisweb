import { useCallback } from "react";

import type { ResourcePickerStore } from "../store/ResourcePickerStore";
import type { PickerResource, RowSelection } from "../type";

type CheckboxProps = ReturnType<NonNullable<RowSelection["getCheckboxProps"]>>;

interface UsePickerCardProps {
    store: ResourcePickerStore;
}

function usePickerCard({ store }: UsePickerCardProps) {
    const { checkEnabled, disableResourceIds } = store;

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
        (record: PickerResource) => {
            const props = getEnabledProps(record, [
                {
                    isDisabled: () => !checkEnabled(record),
                },
            ]);
            return {
                ...props,
                onClick: () => {
                    if (!store.multiple && store.selected.length) {
                        store.setSelected([]);
                    }
                },
            };
        },

        [checkEnabled, getEnabledProps, store]
    );

    return { getCheckboxProps, getEnabledProps };
}

export default usePickerCard;
