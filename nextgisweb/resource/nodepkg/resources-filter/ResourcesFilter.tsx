import { debounce } from "lodash-es";
import { useEffect, useMemo, useRef, useState } from "react";

import { AutoComplete, Button, Input, Tooltip } from "@nextgisweb/gui/antd";
import type { AutoCompleteProps } from "@nextgisweb/gui/antd";
import { AutoCompleteHoneypot } from "@nextgisweb/gui/component";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { CompositeRead, ResourceCls } from "@nextgisweb/resource/type/api";

import SettingsIcon from "@nextgisweb/icon/material/tune";

import "./ResourcesFilter.less";

const MIN_SEARCH_LENGTH = 3;

interface ResourcesFilterProps extends Omit<AutoCompleteProps, "onChange"> {
  onChange?: AutoCompleteProps["onSelect"];
  cls?: ResourceCls | ResourceCls[];
}

const resourcesToOptions = (resourcesInfo: CompositeRead[]) => {
  return resourcesInfo.map((resInfo) => {
    const { resource } = resInfo;
    const resourceUrl = routeURL("resource.show", {
      id: resource.id,
    });

    return {
      value: `${resource.id}`,
      key: `${resource.id}`,
      url: resourceUrl,
      label: (
        <div
          className="item"
          style={{
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <svg className="icon">
            <use xlinkHref={`#icon-rescls-${resource.cls}`} />
          </svg>
          <span className="title" title={resource.display_name}>
            {resource.display_name}
          </span>
        </div>
      ),
    };
  });
};

export function ResourcesFilter({
  onChange,
  cls,
  ...rest
}: ResourcesFilterProps) {
  const { makeSignal, abort } = useAbortController();
  const [options, setOptions] = useState<AutoCompleteProps["options"]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [acStatus, setAcSatus] = useState<AutoCompleteProps["status"]>("");

  const makeQuery = useMemo(() => {
    if (search && search.length >= MIN_SEARCH_LENGTH) {
      const q = "";
      if (search) {
        const query: Record<string, string> = {
          display_name__ilike: `%${search}%`,
        };
        // TODO: handle array of classes in search reqest
        if (typeof cls === "string" && cls) {
          query.cls = cls;
        }
        return query;
      }
      return q;
    }
    return null;
  }, [search, cls]);

  const makeSearchRequest = useRef(
    debounce(async ({ query: q }) => {
      setLoading(true);
      try {
        abort();
        const resources = await route("resource.search").get({
          query: q,
          signal: makeSignal(),
        });
        const options = resourcesToOptions(resources as CompositeRead[]);
        setOptions(options);
        setAcSatus("");
      } catch {
        setAcSatus("error");
      } finally {
        setLoading(false);
      }
    }, 1000)
  );

  useEffect(() => {
    if (makeQuery) {
      makeSearchRequest.current({ query: makeQuery });
    } else {
      setOptions([]);
    }
  }, [makeQuery]);

  const onSelect: AutoCompleteProps["onSelect"] = (v, opt) => {
    if (onChange) {
      onChange(v, opt);
    }
  };

  const openAdvanced = () => {
    const base = routeURL("resource.search.page");
    const url = search ? `${base}?q=${encodeURIComponent(search)}` : base;
    window.location.href = url;
  };

  return (
    <>
      <AutoCompleteHoneypot />
      <AutoComplete
        classNames={{
          popup: { root: "ngw-resource-resource-filter-dropdown" },
        }}
        style={{ width: "100%" }}
        popupMatchSelectWidth={290}
        value={search}
        options={options}
        status={acStatus}
        notFoundContent={
          search.length >= MIN_SEARCH_LENGTH
            ? gettext("Resources not found")
            : undefined
        }
        showSearch={{ onSearch: setSearch }}
        onSelect={onSelect}
        {...rest}
      >
        <Input
          size="middle"
          placeholder={gettext("Search resources")}
          suffix={
            <Tooltip title={gettext("Advanced search")}>
              <Button
                type="text"
                size="small"
                icon={<SettingsIcon />}
                loading={loading}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openAdvanced();
                }}
              />
            </Tooltip>
          }
        />
      </AutoComplete>
    </>
  );
}
