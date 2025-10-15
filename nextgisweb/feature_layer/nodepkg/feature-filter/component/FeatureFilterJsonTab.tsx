import { observer } from "mobx-react-lite";
import { Suspense, lazy, useCallback, useMemo } from "react";

import type { FilterEditorStore } from "../FilterEditorStore";

import { LoadingOutlined } from "@ant-design/icons";

const AsyncCode = lazy(() => import("./CodeLazy"));

const CodeLoadingFallback = () => (
    <div
        className="code-loading-fallback"
        style={{ textAlign: "center", padding: "20px" }}
    >
        <LoadingOutlined style={{ fontSize: 24 }} />
        <div
            className="loading-content"
            style={{ height: "200px", width: "100%" }}
        />
    </div>
);

export interface FeatureFilterJsonProps {
    value: string | undefined;
    onChange: (value: string | undefined) => void;
    isValid?: boolean;
}

const FeatureFilterJson = ({
    value,
    onChange,
    isValid = true,
}: FeatureFilterJsonProps) => {
    const onChangeHandle = useCallback(
        (val: string) => {
            const newValue = val === "" ? undefined : val;

            if (!onChange) return;
            onChange(newValue);
        },
        [onChange]
    );

    const jsonEditor = useMemo(
        () => (
            <Suspense fallback={<CodeLoadingFallback />}>
                <AsyncCode
                    value={value}
                    onChange={onChangeHandle}
                    lang="json"
                    lineNumbers
                />
            </Suspense>
        ),
        [onChangeHandle, value]
    );

    return (
        <div className={`editor ${isValid ? "" : "invalid"}`}>{jsonEditor}</div>
    );
};

interface JsonTabProps {
    store: FilterEditorStore;
}

export const FeatureFilterJsonTab = observer(({ store }: JsonTabProps) => {
    const handleJsonChange = useCallback(
        (v: string | undefined) => {
            store.setJsonValue(v);
        },
        [store]
    );

    return (
        <div className="filter-json">
            <FeatureFilterJson
                value={store.jsonValue}
                onChange={handleJsonChange}
                isValid={store.isValid}
            />
        </div>
    );
});

FeatureFilterJsonTab.displayName = "FeatureFilterJsonTab";
