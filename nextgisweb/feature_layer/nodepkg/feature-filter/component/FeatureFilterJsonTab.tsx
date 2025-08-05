import { observer } from "mobx-react-lite";
import {
    Suspense,
    lazy,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { Spin } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FilterEditorStore } from "../FilterEditorStore";

const AsyncCode = lazy(() => import("./CodeLazy"));

const CodeLoadingFallback = () => (
    <div
        className="code-loading-fallback"
        style={{ textAlign: "center", padding: "20px" }}
    >
        <Spin tip={gettext("Loading editor...")} size="large">
            <div
                className="loading-content"
                style={{ height: "200px", width: "100%" }}
            />
        </Spin>
    </div>
);

export interface FeatureFilterJsonProps {
    value: string | undefined;
    onChange: (value: string | undefined) => void;
    isValid?: boolean;
    validationError?: string;
}

const FeatureFilterJson = ({
    value,
    onChange,
    isValid = true,
    validationError,
}: FeatureFilterJsonProps) => {
    const [internalValue, setInternalValue] = useState(value);
    const [isReady, setIsReady] = useState(false);
    const [updateJsonEditor, setUpdateJsonEditor] = useState(true);

    useEffect(() => {
        if (value !== internalValue) {
            setInternalValue(value);
            setUpdateJsonEditor(!updateJsonEditor);
        }
    }, [value]);

    const onChangeHandle = useCallback(
        (val: string) => {
            const newValue = val === "" ? undefined : val;
            setInternalValue(newValue);
            if (!onChange) return;
            onChange(newValue);
        },
        [onChange]
    );

    const jsonEditor = useMemo(
        () => (
            <Suspense fallback={<CodeLoadingFallback />}>
                <AsyncCode
                    value={isReady ? internalValue : undefined}
                    whenReady={() => {
                        setTimeout(() => {
                            setIsReady(true);
                        }, 100);
                    }}
                    onChange={onChangeHandle}
                    lang="json"
                    lineNumbers
                />
            </Suspense>
        ),
        [isReady, updateJsonEditor]
    );

    return (
        <div className={`editor ${isValid ? "" : "invalid"}`}>
            {jsonEditor}
            {!isValid && validationError && (
                <div
                    style={{
                        marginTop: "8px",
                        color: "#ff4d4f",
                        fontSize: "12px",
                        padding: "4px 8px",
                        backgroundColor: "#fff2f0",
                        border: "1px solid #ffccc7",
                        borderRadius: "4px",
                    }}
                >
                    {validationError}
                </div>
            )}
        </div>
    );
};

interface JsonTabProps {
    store: FilterEditorStore;
}

export const FeatureFilterJsonTab = observer(({ store }: JsonTabProps) => {
    const handleJsonChange = (v: string | undefined) => {
        store.setJsonValue(v);
    };

    return (
        <div className="filter-json">
            <FeatureFilterJson
                value={store.jsonValue}
                onChange={handleJsonChange}
                isValid={store.isValid}
                validationError={store.validationError}
            />
        </div>
    );
});

FeatureFilterJsonTab.displayName = "FeatureFilterJsonTab";
