import { useEffect, useMemo, useRef, useState } from "react";

import type { UniqueValuesResult } from "@nextgisweb/feature-layer/type/api";
import { AutoComplete, Select } from "@nextgisweb/gui/antd";
import { useMemoDebounce, useRoute } from "@nextgisweb/pyramid/hook";

import type { DefaultFilterValueInputProps } from "../feature-filter/component/DefaultFilterValueInput";

interface SuggestedValueInputProps extends DefaultFilterValueInputProps {
  style: React.CSSProperties;
  keyname: string;
  isMultiple: boolean;
  resourceId: number;
}

export function UniqueValueInput({
  value,
  keyname,
  resourceId,
  isMultiple,
  ...rest
}: SuggestedValueInputProps) {
  const [data, setData] = useState<UniqueValuesResult | undefined>(undefined);
  const [search, setSearch] = useState("");

  const searchDebounde = useMemoDebounce(search, 500);

  const { route, abort, isLoading } = useRoute("feature_layer.aggregate", {
    id: resourceId,
  });

  const overflowRef = useRef(false);

  const filter = useMemo(() => {
    if (overflowRef.current && searchDebounde.trim()) {
      const escapedValue = searchDebounde.replace(/[%_\\]/g, "\\$&");
      return ["all", ["ilike", ["get", keyname], `%${escapedValue}%`]];
    }
    return null;
  }, [keyname, searchDebounde]);

  useEffect(() => {
    overflowRef.current = false;
    setSearch("");
    setData(undefined);
  }, [keyname, resourceId]);

  useEffect(() => {
    let canceled = false;
    abort();
    route
      .post({
        json: {
          items: [
            {
              type: "unique_values",
              field: keyname,
              order: "count_desc",
              include_counts: true,
              limit: 1000,
            },
          ],
          filter: filter ?? [],
        },
      })
      .then((resp) => {
        if (!canceled) {
          const uniqRes = resp.items.find((r) => r.type === "unique_values");
          if (uniqRes) {
            if (uniqRes.overflow) {
              overflowRef.current = true;
            }
            setData(uniqRes);
          }
        }
      });
    return () => {
      canceled = true;
    };
  }, [abort, keyname, route, filter]);

  const options = useMemo(() => {
    if (!data) return [];

    return data.buckets
      .filter((bucket) => bucket.key !== null)
      .map(({ key, count }) => ({
        label: `${String(key)}${count !== undefined ? ` (${count})` : ""}`,
        value: String(key),
      }));
  }, [data]);

  const filterOption = (
    input: string,
    option?: { label?: unknown; value?: unknown }
  ) =>
    String(option?.label ?? option?.value ?? "")
      .toLowerCase()
      .includes(input.toLowerCase());

  const onSearch = (nextSearch: string) => {
    setSearch(nextSearch);
  };

  if (isMultiple) {
    return (
      <Select
        mode="tags"
        value={Array.isArray(value) ? value.map(String) : []}
        options={options}
        loading={isLoading}
        showSearch={{ filterOption, onSearch }}
        {...rest}
      />
    );
  }

  return (
    <AutoComplete
      value={value !== null ? String(value) : undefined}
      options={options}
      showSearch={{ filterOption, onSearch }}
      {...rest}
    />
  );
}
