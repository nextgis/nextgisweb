import { useEffect, useState, useCallback, useMemo } from "react";
import debounce from "lodash/debounce";
import { Input, AutoComplete } from "@nextgisweb/gui/antd";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!resource";
import { PropTypes } from "prop-types";

import "./ResourcesFilter.less";

const resourcesToOptions = (resourcesInfo) => {
    return resourcesInfo.map((resInfo) => {
        const { resource } = resInfo;
        const resourceUrl = routeURL("resource.show", {
            id: resource.id,
        });

        return {
            value: `${resource.display_name}`,
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

export function ResourcesFilter({ onChange, cls, ...rest }) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [acStatus, setAcSatus] = useState("");

    const makeQuery = useMemo(() => {
        if (search && search.length > 2) {
            const q = {};
            if (search) {
                const query = { display_name__ilike: `%${search}%` };
                if (cls) {
                    query.cls = cls;
                }
                return {
                    query,
                };
            }
            return q;
        }
        return null;
    }, [search]);

    const makeSearchRequest = useCallback(
        debounce(async ({ query: q, signal }) => {
            setLoading(true);
            try {
                const resources = await route("resource.search").get(q, signal);
                const options = resourcesToOptions(resources);
                setOptions(options);
                setAcSatus("");
            } catch (er) {
                setAcSatus("error");
            } finally {
                setLoading(false);
            }
        }, 1000),
        []
    );

    useEffect(() => {
        let signal;
        let controller;
        if (makeQuery) {
            if (window.AbortController) {
                controller = new AbortController();
                signal = controller.signal;
            }
            makeSearchRequest({ signal, query: makeQuery });
        } else {
            setOptions([]);
        }
        return () => {
            if (controller) {
                controller.abort();
            }
        };
    }, [makeQuery]);

    const onSelect = (v, opt) => {
        if (onChange) {
            onChange(v, opt);
        }
    };

    return (
        <AutoComplete
            dropdownClassName="ngw-resource-resource-filter-dropdown"
            dropdownMatchSelectWidth={290}
            style={{ width: 290 }}
            onSelect={onSelect}
            options={options}
            status={acStatus}
            notFoundContent={i18n.gettext("Resources not found")}
            {...rest}
        >
            <Input.Search
                size="middle"
                placeholder={i18n.gettext("Search resources")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                loading={loading}
            />
        </AutoComplete>
    );
}

ResourcesFilter.propTypes = {
    onChange: PropTypes.func,
    cls: PropTypes.string,
};
