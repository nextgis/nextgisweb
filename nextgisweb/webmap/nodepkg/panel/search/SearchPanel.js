import debounce from "lodash-es/debounce";
import GeoJSON from "ol/format/GeoJSON";
import { useCallback, useState } from "react";

import { Alert, Button, Input, Spin } from "@nextgisweb/gui/antd";
import { request, route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import webmapSettings from "@nextgisweb/pyramid/settings!webmap";
import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";
import { lonLatToDM } from "@nextgisweb/webmap/coordinates/formatter";
import { parse } from "@nextgisweb/webmap/coordinates/parser";

import { CloseButton } from "../header/CloseButton";

import { LoadingOutlined } from "@ant-design/icons";
import BackspaceIcon from "@nextgisweb/icon/material/backspace";
import LayersIcon from "@nextgisweb/icon/material/layers";
import LocationOnIcon from "@nextgisweb/icon/material/location_on";
import PublicIcon from "@nextgisweb/icon/material/public";

import "./SearchPanel.less";

const GEO_JSON_FORMAT = new GeoJSON();

const parseCoordinatesInput = async (criteria, limit, display) => {
    const coordinates = parse(criteria);
    const searchResults = [];
    const featureProjection = display.displayProjection;
    coordinates.forEach((c) => {
        const { lat, lon } = c;
        const searchResult = {
            label: lonLatToDM([lon, lat]),
            geometry: GEO_JSON_FORMAT.readGeometry(
                {
                    "type": "Point",
                    "coordinates": [lon, lat],
                },
                { featureProjection }
            ),
            type: "place",
            key: limit,
        };
        searchResults.push(searchResult);
        limit = limit - 1;
    });
    return [limit, searchResults, false];
};

const searchByLayers = async (criteria, limit, display, controller) => {
    const visibleItems = await display.getVisibleItems();
    const requests = [];
    visibleItems.forEach((i) => {
        const id = display.itemStore.getValue(i, "id");
        const layerId = display.itemStore.getValue(i, "layerId");
        const itmConfig = display._itemConfigById[id];
        const pluginConfig = itmConfig.plugin["ngw-webmap/plugin/FeatureLayer"];

        if (pluginConfig === undefined || !pluginConfig.likeSearch) return;

        const query = {
            ilike: criteria,
            limit: limit,
            geom_format: "geojson",
            label: true,
        };
        const signal = controller.makeSignal();
        const request = route("feature_layer.feature.collection", layerId).get({
            query,
            signal,
        });
        requests.push(request);
    });

    const results = await Promise.allSettled(requests);
    const searchResults = [];
    let isExceeded = false;
    results.forEach((r) => {
        if (r.status !== "fulfilled" || !r.value || limit < 1) return;
        r.value.forEach((feature) => {
            if (isExceeded) return;
            const searchResult = {
                label: feature.label,
                geometry: GEO_JSON_FORMAT.readGeometry(feature.geom),
                type: "layers",
                key: limit,
            };
            searchResults.push(searchResult);
            limit = limit - 1;
            isExceeded = limit < 1;
        });
    });

    return [limit, searchResults, isExceeded];
};

const searchByNominatim = async (criteria, limit, display, controller) => {
    const searchResults = [];
    if (
        !webmapSettings.address_search_enabled ||
        webmapSettings.address_geocoder !== "nominatim"
    ) {
        return [limit, searchResults];
    }

    const query = {
        format: "geojson",
        limit: "30",
        q: criteria,
        polygon_geojson: 1,
    };

    if (webmapSettings.address_search_extent) {
        const extent = display.config.extent;
        query.bounded = "1";
        query.viewbox = extent.join(",");
    }

    if (webmapSettings.nominatim_countrycodes) {
        query.countrycodes = webmapSettings.nominatim_countrycodes;
    }

    const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
    const headers = { "X-Requested-With": null };
    const global = true;
    const signal = controller.makeSignal();
    const geojson = await request(NOMINATIM_SEARCH_URL, {
        query,
        headers,
        signal,
        global,
    });
    const features = geojson.features;
    let isExceeded = false;
    features.forEach((f) => {
        if (isExceeded) return;
        const searchResult = {
            label: f.properties.display_name,
            geometry: GEO_JSON_FORMAT.readGeometry(f.geometry, {
                featureProjection: display.displayProjection,
            }),
            type: "public",
            key: limit,
        };
        searchResults.push(searchResult);
        limit = limit - 1;
        isExceeded = limit < 1;
    });

    return [limit, searchResults, isExceeded];
};

const searchByYandex = async (criteria, limit, display, controller) => {
    const searchResults = [];
    if (
        !webmapSettings.address_search_enabled ||
        webmapSettings.address_geocoder !== "yandex"
    ) {
        return [limit, searchResults];
    }

    const apikey = webmapSettings.yandex_api_geocoder_key;
    const query = {
        apikey,
        geocode: criteria,
        format: "json",
    };

    if (webmapSettings.address_search_extent && display.config.extent) {
        const extent = this.display.config.extent;
        query.bbox = `${extent[0]},${extent[1]}~${extent[2]},${extent[3]}`;
    }

    const YANDEX_SEARCH_URL = "https://geocode-maps.yandex.ru/1.x/";
    const global = true;
    const signal = controller.makeSignal();
    const yaGeocoderResponse = await request(YANDEX_SEARCH_URL, {
        query,
        global,
        signal,
    });
    let featureMembers = [];
    if (
        yaGeocoderResponse &&
        yaGeocoderResponse.response &&
        yaGeocoderResponse.response.GeoObjectCollection &&
        yaGeocoderResponse.response.GeoObjectCollection.featureMember
    ) {
        featureMembers =
            yaGeocoderResponse.response.GeoObjectCollection.featureMember;
    }

    let isExceeded = false;
    featureMembers.forEach((featureMember) => {
        if (isExceeded || !featureMember.GeoObject) return;
        const geoObject = featureMember.GeoObject;
        const [lon, lat] = featureMember.GeoObject.Point.pos.split(" ");
        const searchResult = {
            label: geoObject.name,
            geometry: GEO_JSON_FORMAT.readGeometry(
                {
                    "type": "Point",
                    "coordinates": [lon, lat],
                },
                {
                    featureProjection: display.displayProjection,
                }
            ),
            type: "public",
            key: limit,
        };
        searchResults.push(searchResult);
        limit = limit - 1;
        isExceeded = limit < 1;
    });

    return [limit, searchResults, isExceeded];
};

const searchSteps = [
    parseCoordinatesInput,
    searchByLayers,
    searchByNominatim,
    searchByYandex,
];

const search = async (criteria, searchController, display) => {
    let searchResults = [],
        isExceeded = false,
        limit = 100,
        results;

    searchController.makeSignal();

    for (const searchStep of searchSteps) {
        try {
            [limit, results, isExceeded] = await searchStep(
                criteria,
                limit,
                display,
                searchController
            );
            searchResults = searchResults.concat(results);
        } catch (e) {
            console.error(e);
        }
        if (searchController.empty) {
            return undefined;
        }
        if (isExceeded) return [searchResults, isExceeded];
    }
    return [searchResults, isExceeded];
};

export const SearchPanel = ({ display, close }) => {
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState(undefined);
    const [resultSelected, setResultSelected] = useState(undefined);
    const [searchText, setSearchText] = useState(undefined);
    const [searchController, setSearchController] = useState(undefined);

    const _search = useCallback(
        debounce(async (searchText) => {
            clearResults();
            setLoading(true);
            const controller = new AbortControllerHelper();
            setSearchController(controller);
            const results = await search(searchText, controller, display);
            setSearchResults(results);
            setLoading(false);
        }, 1000),
        []
    );

    const searchChange = (e) => {
        const value = e.target.value;
        setSearchText(value);
        if (value && value.trim() && value.trim().length > 1) {
            _search(value);
        } else {
            clearResults();
        }
    };

    const selectResult = (resultInfo) => {
        setResultSelected(resultInfo);
        display.highlightGeometry(resultInfo.geometry);
    };

    const makeResult = (resultInfo) => {
        const isSelected =
            resultSelected && resultSelected.key === resultInfo.key;

        let resultSourceIcon = <PublicIcon />;
        if (resultInfo.type === "public") {
            resultSourceIcon = <PublicIcon />;
        } else if (resultInfo.type === "place") {
            resultSourceIcon = <LocationOnIcon />;
        } else if (resultInfo.type === "layers") {
            resultSourceIcon = <LayersIcon />;
        }

        return (
            <div
                className={`result ${isSelected ? "selected" : ""}`}
                key={resultInfo.key}
                onClick={() => selectResult(resultInfo)}
            >
                <span>
                    {resultInfo.label}
                    {resultSourceIcon}
                </span>
            </div>
        );
    };

    let results = null;
    let info = null;
    if (searchResults && !loading) {
        const [resultsInfo, isExceeded] = searchResults;
        results = resultsInfo.map((r) => makeResult(r));
        if (resultsInfo.length === 0) {
            info = (
                <Alert message={gettext("Not found")} type="info" showIcon />
            );
        } else if (isExceeded) {
            info = (
                <Alert
                    message={gettext(
                        "Refine search criterion. Displayed first 100 search results."
                    )}
                    type="warning"
                    showIcon
                />
            );
        }
    } else if (loading) {
        const indicator = <LoadingOutlined style={{ fontSize: 30 }} spin />;
        results = <Spin className="loading" indicator={indicator} />;
    }

    const clearSearchText = () => {
        setSearchText(undefined);
        clearResults();
    };

    const clearResults = () => {
        if (searchController) {
            searchController.abort();
            setSearchController(undefined);
        }
        setSearchResults(undefined);
        setLoading(false);
    };

    return (
        <div className="ngw-webmap-search-panel">
            <div className="control">
                <Input
                    onChange={searchChange}
                    variant="borderless"
                    placeholder={gettext("Enter at least 2 characters")}
                    value={searchText}
                />
                {searchText && searchText.trim() && (
                    <Button
                        onClick={() => clearSearchText()}
                        type="text"
                        shape="circle"
                        icon={<BackspaceIcon />}
                    />
                )}
                <CloseButton {...{ close }} />
            </div>
            {info}
            <div className="results">{results}</div>
        </div>
    );
};
