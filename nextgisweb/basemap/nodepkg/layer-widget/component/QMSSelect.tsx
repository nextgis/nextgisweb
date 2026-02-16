import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import settings from "@nextgisweb/basemap/client-settings";
import { Select, Spin } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";
import { OpenInNewIcon } from "@nextgisweb/gui/icon";
import { useAbortController, useDebounce } from "@nextgisweb/pyramid/hook";
import { LoaderCache } from "@nextgisweb/pyramid/util/loader";

import { get, search } from "../service/qms";
import type { QMSSearch, QMSService } from "../type";

const searchCache = new LoaderCache<QMSSearch[]>();
const getCache = new LoaderCache<QMSService>();

interface QMSSelectProps extends Omit<
    SelectProps<number>,
    "options" | "children"
> {
    onChange: (value: number | undefined) => void;
    onService?: (value: QMSService) => void;
    value: number | undefined;
}

interface SearchOption {
    value: number;
    label: string;
    result: QMSSearch;
}

async function fetchOptions(
    query: string | number,
    signal: AbortSignal
): Promise<SearchOption[]> {
    try {
        let results: QMSSearch[] = [];
        if (!isNaN(Number(query))) {
            try {
                const result = await getCache.promiseFor(String(query), () =>
                    get(Number(query), {
                        signal,
                    })
                );
                if (result.type === "tms") {
                    results = [result];
                }
            } catch {
                // pass
            }
        } else if (typeof query === "string") {
            if (results.length === 0) {
                results = await searchCache.promiseFor(query, () =>
                    search(query, {
                        signal,
                    })
                );
            }
        }
        return results.map((result) => ({
            value: result.id,
            label: result.name,
            result,
        }));
    } catch {
        return [];
    }
}

function QMSLabel({ name, id }: { name: string; id: number }) {
    return (
        <>
            {name}
            <a
                style={{ paddingLeft: "3px" }}
                href={`${settings.qms.url}/geoservices/${id}`}
                target="_blank"
            >
                <OpenInNewIcon />
            </a>
        </>
    );
}

export function QMSSelect({
    onService,
    onChange,
    value,
    ...restSelectProps
}: QMSSelectProps) {
    const [fetching, setFetching] = useState(false);
    const [options, setOptions] = useState<SearchOption[]>([]);

    const fetchRef = useRef(0);
    const { makeSignal, abort } = useAbortController();

    const loadOptions = useCallback(
        async (value: string | number) => {
            fetchRef.current += 1;
            const fetchId = fetchRef.current;
            setOptions([]);
            if (String(value).trim() === "") {
                return [];
            }
            setFetching(true);
            const newOptions = await fetchOptions(value, makeSignal());
            if (fetchId !== fetchRef.current) {
                // for fetch callback order
                return;
            }
            setOptions(newOptions);
            setFetching(false);
        },
        [makeSignal]
    );

    const debounceFetcher = useDebounce(loadOptions, 800);

    const handleSelect = useCallback(
        async (id: number) => {
            try {
                const data = await getCache.promiseFor(String(id), () =>
                    get(Number(id), { signal: makeSignal() })
                );
                if (onService) {
                    onService(data);
                }
                onChange(data.id);
            } catch {
                // TODO: handle error
            }
        },
        [makeSignal, onChange, onService]
    );

    useEffect(() => {
        if (value) {
            loadOptions(value);
        }
    }, [value, loadOptions]);

    const selectOptions = useMemo(
        () =>
            options.map((option) => {
                return {
                    value: option.value,
                    label: <QMSLabel name={option.label} id={option.value} />,
                };
            }),
        [options]
    );

    return (
        <Select
            showSearch={{
                filterOption: false,

                onSearch: (val) => {
                    abort("Abort search request");
                    debounceFetcher(val);
                },
            }}
            value={value}
            onSelect={handleSelect}
            loading={fetching}
            onClear={() => {
                setOptions([]);
                onChange(undefined);
            }}
            notFoundContent={fetching ? <Spin size="small" /> : null}
            allowClear
            style={{ width: "100%" }}
            labelRender={({ value }) => {
                const option = options.find((o) => o.value === value);
                if (option) {
                    return (
                        <QMSLabel
                            name={option.result.name}
                            id={option.result.id}
                        />
                    );
                }
                return "";
            }}
            options={selectOptions}
            {...restSelectProps}
        />
    );
}
