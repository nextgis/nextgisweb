import { useEffect, useMemo, useState } from "react";

import type { UniqueValuesResult } from "@nextgisweb/feature-layer/type/api";
import { AutoComplete, Select } from "@nextgisweb/gui/antd";
import { useRoute } from "@nextgisweb/pyramid/hook";

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

  const { route, abort, isLoading } = useRoute("feature_layer.aggregate", {
    id: resourceId,
  });

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
              include_counts: false,
              limit: 1000,
            },
          ],
          // TODO: Enable search after adding filter `ilike` support,
          // because the current `==` operation does not work for this case.
          filter: [],
        },
      })
      .then((resp) => {
        if (!canceled) {
          const uniqRes = resp.items.find((r) => r.type === "unique_values");
          if (uniqRes) {
            setData(uniqRes);
          }
        }
      });
    return () => {
      canceled = true;
    };
  }, [abort, keyname, route]);

  const options = useMemo(() => {
    if (!data) return [];

    return data.buckets
      .filter((bucket) => bucket.key !== null)
      .map(({ key }) => ({
        label: String(key),
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

  if (isMultiple) {
    return (
      <Select
        mode="tags"
        value={Array.isArray(value) ? value.map(String) : []}
        options={options}
        loading={isLoading}
        showSearch={{ filterOption }}
        {...rest}
      />
    );
  }

  return (
    <AutoComplete
      value={value !== null ? String(value) : undefined}
      options={options}
      showSearch={{ filterOption }}
      {...rest}
    />
  );
}
