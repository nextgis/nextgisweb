import type { FeatureCollection } from "geojson";
import { debounce } from "lodash-es";
import { observer } from "mobx-react-lite";
import GeoJSON from "ol/format/GeoJSON";
import type { Geometry } from "ol/geom";
import { createContext, useCallback, useContext, useState } from "react";

import { Alert, Input, Spin } from "@nextgisweb/gui/antd";
import { request, route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";
import webmapSettings from "@nextgisweb/webmap/client-settings";
import { lonLatToDM } from "@nextgisweb/webmap/coordinates/formatter";
import { parse } from "@nextgisweb/webmap/coordinates/parser";
import type { Display } from "@nextgisweb/webmap/display";

import { PanelContainer, PanelTitle } from "../component";
import type { PanelTitleProps } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import { LoadingOutlined } from "@ant-design/icons";
import BackspaceIcon from "@nextgisweb/icon/material/backspace";
import LayersIcon from "@nextgisweb/icon/material/layers";
import LocationOnIcon from "@nextgisweb/icon/material/location_on";
import PublicIcon from "@nextgisweb/icon/material/public";
import "./SearchPanel.less";
import type { FeatureLayerWebMapPluginConfig } from "@nextgisweb/webmap/plugin/type";

interface SearchResult {
    label: string;
    geometry: Geometry;
    type: "place" | "layers" | "public";
    key: number;
}

interface FeatureResponse {
    label: string;
    geom: any;
}

interface YandexGeoObject {
    name: string;
    Point: {
        pos: string;
    };
}

interface YandexFeatureMember {
    GeoObject?: YandexGeoObject;
}

interface YandexResponse {
    response?: {
        GeoObjectCollection?: {
            featureMember?: YandexFeatureMember[];
        };
    };
}

type SearchStepResult = [number, SearchResult[], boolean];
type SearchFunction = (
    criteria: string,
    limit: number,
    display: Display,
    controller: AbortControllerHelper
) => Promise<SearchStepResult>;

const GEO_JSON_FORMAT = new GeoJSON();

const parseCoordinatesInput: SearchFunction = async (
    criteria,
    limit,
    display
) => {
    const coordinates = parse(criteria);
    const searchResults: SearchResult[] = [];
    const featureProjection = display.displayProjection;
    coordinates.forEach((c) => {
        const { lat, lon } = c;
        const searchResult: SearchResult = {
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

const searchByLayers: SearchFunction = async (
    criteria,
    limit,
    display,
    controller
) => {
    const visibleItems = await display.getVisibleItems();
    const requests: Promise<FeatureResponse[]>[] = [];
    visibleItems.forEach((i) => {
        const id = display.itemStore.getValue(i, "id");
        const layerId = display.itemStore.getValue(i, "layerId");
        const itmConfig = display._itemConfigById[id];
        if (itmConfig.type !== "layer") {
            return;
        }
        const pluginConfig = itmConfig.plugin[
            "@nextgisweb/webmap/plugin/feature-layer"
        ] as FeatureLayerWebMapPluginConfig;

        if (pluginConfig === undefined || !pluginConfig.likeSearch) return;

        const signal = controller.makeSignal();
        const request = route("feature_layer.feature.collection", layerId).get({
            query: {
                limit: limit,
                geom_format: "geojson",
                label: true,
                dt_format: "iso",
                fields: [],
                extensions: [],
                // @ts-expect-error not in tsgen api yet
                ilike: criteria,
            },
            signal,
        });
        requests.push(request);
    });

    const results = await Promise.allSettled(requests);
    const searchResults: SearchResult[] = [];
    let isExceeded = false;
    results.forEach((r) => {
        if (r.status !== "fulfilled" || !r.value || limit < 1) return;
        r.value.forEach((feature) => {
            if (isExceeded) return;
            const searchResult: SearchResult = {
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

interface NominatimQuery {
    format?: "geojson";
    limit?: string;
    q?: string;
    polygon_geojson?: number;
    bounded?: string;
    viewbox?: string;
    countrycodes?: string;
}

const searchByNominatim: SearchFunction = async (
    criteria,
    limit,
    display,
    controller
) => {
    const searchResults: SearchResult[] = [];
    if (
        !webmapSettings.address_search_enabled ||
        webmapSettings.address_geocoder !== "nominatim"
    ) {
        return [limit, searchResults, false];
    }

    const query: NominatimQuery = {
        format: "geojson",
        limit: "30",
        q: criteria,
        polygon_geojson: 1,
    };

    if (webmapSettings.address_search_extent) {
        const extent = display.config.initialExtent;
        query.bounded = "1";
        query.viewbox = extent.join(",");
    }

    if (webmapSettings.nominatim_countrycodes) {
        query.countrycodes = webmapSettings.nominatim_countrycodes;
    }

    const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
    const headers = { "X-Requested-With": "null" };
    const global = true;
    const signal = controller.makeSignal();
    const geojson = (await request(NOMINATIM_SEARCH_URL, {
        query,
        headers,
        signal,
        global,
    })) as FeatureCollection;
    const features = geojson.features;
    let isExceeded = false;
    features.forEach((f) => {
        if (isExceeded) return;
        const searchResult: SearchResult = {
            label: f.properties?.display_name,
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

interface YandexGeocoderQuery {
    apikey?: string | null;
    geocode?: string;
    format?: "json";
    bbox?: string;
}

const searchByYandex: SearchFunction = async (
    criteria,
    limit,
    display,
    controller
) => {
    const searchResults: SearchResult[] = [];
    if (
        !webmapSettings.address_search_enabled ||
        webmapSettings.address_geocoder !== "yandex"
    ) {
        return [limit, searchResults, false];
    }

    const apikey = webmapSettings.yandex_api_geocoder_key;
    const query: YandexGeocoderQuery = {
        apikey,
        geocode: criteria,
        format: "json",
    };

    if (webmapSettings.address_search_extent && display.config.initialExtent) {
        const extent = display.config.initialExtent;
        query.bbox = `${extent[0]},${extent[1]}~${extent[2]},${extent[3]}`;
    }

    const YANDEX_SEARCH_URL = "https://geocode-maps.yandex.ru/1.x/";
    const global = true;
    const signal = controller.makeSignal();
    const yaGeocoderResponse = await request<YandexResponse>(
        YANDEX_SEARCH_URL,
        {
            query,
            global,
            signal,
        }
    );
    let featureMembers: YandexFeatureMember[] = [];
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
        const searchResult: SearchResult = {
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

const search = async (
    criteria: string,
    searchController: AbortControllerHelper,
    display: Display
): Promise<[SearchResult[], boolean] | undefined> => {
    let searchResults: SearchResult[] = [],
        isExceeded = false,
        limit = 100,
        results: SearchResult[];

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
        } catch (err) {
            console.error(err);
        }
        if (searchController.empty) {
            return undefined;
        }
        if (isExceeded) return [searchResults, isExceeded];
    }
    return [searchResults, isExceeded];
};

const SearchPanelContext = createContext<any>(null);
SearchPanelContext.displayName = "SearchPanelContext";

function SearchPanelTitle({ className, close }: PanelTitleProps) {
    const { searchText, searchChange, clearSearchText } =
        useContext(SearchPanelContext);
    return (
        <div className={className}>
            <Input
                className="content"
                variant="borderless"
                value={searchText}
                onChange={searchChange}
                placeholder={gettext("Enter at least 2 characters")}
            />

            {searchText && searchText.trim() && (
                <PanelTitle.Button
                    icon={<BackspaceIcon />}
                    onClick={() => clearSearchText()}
                />
            )}
            <PanelTitle.ButtonClose close={close} />
        </div>
    );
}

const SearchPanel = observer<PanelPluginWidgetProps>(({ store, display }) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [searchResults, setSearchResults] = useState<
        [SearchResult[], boolean] | undefined
    >(undefined);
    const [resultSelected, setResultSelected] = useState<
        SearchResult | undefined
    >(undefined);
    const [searchText, setSearchText] = useState<string | undefined>(undefined);
    const [searchController, setSearchController] = useState<
        AbortControllerHelper | undefined
    >(undefined);

    const clearResults = () => {
        if (searchController) {
            searchController.abort();
            setSearchController(undefined);
        }
        setSearchResults(undefined);
        setLoading(false);
    };

    const _search = useCallback(
        debounce(async (searchText: string) => {
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

    const searchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchText(value);
        if (value && value.trim() && value.trim().length > 1) {
            _search(value);
        } else {
            clearResults();
        }
    };

    const selectResult = (resultInfo: SearchResult) => {
        setResultSelected(resultInfo);
        display.highlightGeometry(resultInfo.geometry);
    };

    const makeResult = (resultInfo: SearchResult) => {
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

    let results: React.ReactNode = null;
    let info: React.ReactNode = null;
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

    return (
        <SearchPanelContext.Provider
            value={{
                searchText,
                searchChange,
                clearSearchText,
            }}
        >
            <PanelContainer
                className="ngw-webmap-panel-search"
                close={store.close}
                prolog={info}
                components={{
                    title: SearchPanelTitle,
                    prolog: PanelContainer.Unpadded,
                    content: PanelContainer.Unpadded,
                }}
            >
                <div className="results">{results}</div>
            </PanelContainer>
        </SearchPanelContext.Provider>
    );
});

SearchPanel.displayName = "SearchPanel";
export default SearchPanel;
