import { observer } from "mobx-react-lite";

import type { FilterEditorStore } from "../FilterEditorStore";

import { FilterGroup } from "./FilterGroup";

interface ConstructorTabProps {
    store: FilterEditorStore;
}

export const ConstructorTab = observer(({ store }: ConstructorTabProps) => {
    return (
        <div className="filter-constructor">
            <div className="filter-root">
                <FilterGroup
                    group={store.filterState}
                    store={store}
                    isRoot={true}
                />
            </div>
        </div>
    );
});

ConstructorTab.displayName = "FeatureFilterConstructorTab";
