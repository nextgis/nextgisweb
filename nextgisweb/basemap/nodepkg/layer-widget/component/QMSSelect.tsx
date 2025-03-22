import { debounce } from "lodash-es";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import settings from "@nextgisweb/basemap/client-settings";
import { Select, Spin } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";
import { OpenInNewIcon } from "@nextgisweb/gui/icon";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { LoaderCache } from "@nextgisweb/pyramid/util/loader";

import { get, search } from "../service/qms";
import type { QMSSearch, QMSService } from "../type";

const searchCache = new LoaderCache<QMSSearch[]>();
const getCache = new LoaderCache<QMSService>();

interface QMSSelectProps
    extends Omit<SelectProps<number>, "options" | "children"> {
    onChange: (value: number | undefined) => void;
    onService?: (value: QMSService) => void;
    value: number | undefined;
}

interface SearchOption {
    value: number;
    label: string;
    result: QMSSearch;
}

function QMSLabel({ name, id }: { name: string; id: number }) {
    return (
        <>
            {name}
            <a
                style={{ paddingLeft: "3px" }}
                href={`${settings.qms_url}/geoservices/${id}`}
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

    const fetchOptions = useCallback(
        async (query: string | number): Promise<SearchOption[]> => {
            try {
                let results: QMSSearch[] = [];
                if (!isNaN(Number(query))) {
                    try {
                        const result = await getCache.promiseFor(
                            String(query),
                            () =>
                                get(Number(query), {
                                    signal: makeSignal(),
                                })
                        );
                        if (result.type === "tms") {
                            results = [result];
                        }
                    } catch {
                        // pass
                    }
                }
                if (typeof query === "string") {
                    if (results.length === 0) {
                        results = await searchCache.promiseFor(query, () =>
                            search(query, {
                                signal: makeSignal(),
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
        },
        [makeSignal]
    );

    const loadOptions = useCallback(
        async (value: string | number) => {
            fetchRef.current += 1;
            const fetchId = fetchRef.current;
            setOptions([]);
            setFetching(true);

            const newOptions = await fetchOptions(value);
            if (fetchId !== fetchRef.current) {
                // for fetch callback order
                return;
            }
            setOptions(newOptions);
            setFetching(false);
        },
        [fetchOptions]
    );

    const debounceFetcher = useMemo(() => {
        return debounce(loadOptions, 800);
    }, [loadOptions]);

    const handleSelect = async (id: number) => {
        try {
            const data = await getCache.promiseFor(String(id), () =>
                get(Number(id), { signal: makeSignal() })
            );
            if (onService) {
                onService(data);
            }
            onChange(data.id);
        } catch (err) {
            // TODO: handle error
        }
    };

    useEffect(() => {
        if (value) {
            loadOptions(value);
        }
    }, [value, loadOptions]);

    return (
        <Select
            showSearch
            value={value}
            onSearch={(val) => {
                abort("Abort search request");
                debounceFetcher(val);
            }}
            onSelect={handleSelect}
            loading={fetching}
            onClear={() => {
                setOptions([]);
                onChange(undefined);
            }}
            notFoundContent={fetching ? <Spin size="small" /> : null}
            allowClear
            filterOption={false}
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
            options={options.map((option) => {
                return {
                    value: option.value,
                    label: <QMSLabel name={option.label} id={option.value} />,
                };
            })}
            {...restSelectProps}
        />
    );
}
