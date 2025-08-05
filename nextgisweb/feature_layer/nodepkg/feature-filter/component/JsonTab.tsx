import { observer } from "mobx-react-lite";

import { Code } from "@nextgisweb/gui/component/code";

import type { FilterEditorStore } from "../FilterEditorStore";

interface JsonTabProps {
    store: FilterEditorStore;
}

export const JsonTab = observer(({ store }: JsonTabProps) => {
    const handleJsonChange = (v: string) => {
        store.setJsonValue(v);
    };

    return (
        <div className="filter-json">
            <Code
                value={store.jsonValue}
                onChange={handleJsonChange}
                lang="json"
                lineNumbers
            />
        </div>
    );
});

JsonTab.displayName = "FeatureFilterJsonTab";
