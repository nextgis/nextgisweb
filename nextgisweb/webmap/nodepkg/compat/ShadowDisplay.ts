/** @entrypoint */
import topic from "dojo/topic";
import { Feature } from "ol";
import View from "ol/View";
import type { Control } from "ol/control";
import type { Geometry } from "ol/geom";
import { fromLonLat, transformExtent } from "ol/proj";

import { errorModal } from "@nextgisweb/gui/error";
import { appendTo } from "@nextgisweb/pyramid/company-logo";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { buildControls } from "@nextgisweb/webmap/map-controls";
import MapToolbar from "@nextgisweb/webmap/map-toolbar";
import PanelsManager from "@nextgisweb/webmap/panels-manager";

import { FeatureHighlighter } from "../feature-highlighter/FeatureHighlighter";
import { LinkToMainMap } from "../map-controls/control/LinkToMainMap";
import MapStatesObserver from "../map-state-observer";
import { Map } from "../ol/Map";
import type { BaseLayer } from "../ol/layer/_Base";
import type { PanelElements } from "../panels-manager/PanelsManager";
import WebmapStore from "../store";
import type {
    DojoDisplay,
    MapPlugin,
    MapURLParams,
    PanelDojoItem,
} from "../type";
import type { RootItemConfig, TreeItemConfig } from "../type/TreeItems";
import { getURLParams, setURLParam } from "../utils/URL";

import { CustomItemFileWriteStore } from "./CustomItemFileWriteStore";
import type { StoreItem } from "./CustomItemFileWriteStore";
import { LoggedDeferred } from "./LoggedDeferred";
import { makePanels } from "./makePanels";
import type { StoreGroupConfig, StoreItemConfig } from "./type";
import { entrypointsLoader } from "./util/entrypointLoader";
import { handlePostMessage } from "./util/handlePostMessage";

import "./Display.css";

export default class ShadowDisplay {
    private readonly modeURLParam: keyof MapURLParams = "panel";
    private readonly emptyModeURLValue = "none";

    constructor(private display: DojoDisplay) {
        display._urlParams = getURLParams<MapURLParams>();

        display._itemStoreDeferred = new LoggedDeferred("_itemStoreDeferred");
        display._mapDeferred = new LoggedDeferred("_mapDeferred");
        display._mapExtentDeferred = new LoggedDeferred("_mapExtentDeferred");
        display._layersDeferred = new LoggedDeferred("_layersDeferred");
        display._postCreateDeferred = new LoggedDeferred("_postCreateDeferred");
        display._startupDeferred = new LoggedDeferred("_startupDeferred");

        display.mapStates = MapStatesObserver.getInstance();

        // AMD module loading
        display._midDeferred = {};
        display._mid = {};

        this._buildPanelsManager();

        // Add basemap's AMD modules
        this._initializeMids();

        // Map plugins
        const wmpmids = Object.keys(display.config.webmapPlugin);
        const deferred = new LoggedDeferred("_midDeferred.webmapPlugin");

        display._midDeferred.webmapPlugin = deferred;

        entrypointsLoader(wmpmids).then((obj) => {
            display._mid.wmplugin = obj;

            deferred.resolve(obj);
        });

        this._itemStoreSetup();
        this._webmapStoreSetup();

        display._mapDeferred.then(() => {
            this._itemStorePrepare();
        });

        display.displayProjection = "EPSG:3857";
        display.lonlatProjection = "EPSG:4326";

        if (display.config.extent[3] > 82) {
            display.config.extent[3] = 82;
        }
        if (display.config.extent[1] < -82) {
            display.config.extent[1] = -82;
        }

        display._extent = transformExtent(
            display.config.extent,
            display.lonlatProjection,
            display.displayProjection
        );

        display._extent_const = transformExtent(
            display.config.extent_const,
            display.lonlatProjection,
            display.displayProjection
        );

        // // Layers panel
        this._layersPanelSetup();

        // // Map and plugins
        Promise.all([
            display._midDeferred.basemap,
            display._midDeferred.webmapPlugin,
            display._startupDeferred,
        ])
            .then(() => {
                this._pluginsSetup(true);
                this._mapSetup();
            })
            .catch((err) => {
                console.error(err);
            });

        // // Setup layers
        Promise.all([display._midDeferred.adapter, display._itemStoreDeferred])
            .then(() => {
                this._layersSetup();
            })
            .catch((err) => {
                console.error(err);
            });

        Promise.all([display._layersDeferred, this._mapSetup])
            .then(() => {
                this._mapAddLayers();
                display.featureHighlighter =
                    this._initializeFeatureHighlighter();
            })
            .catch((err) => {
                console.error(err);
            });

        // Tools and plugins
        Promise.all([display._midDeferred.plugin, display._layersDeferred])
            .then(() => {
                this._pluginsSetup();
                this._buildLayersTree();
            })
            .then(undefined, function (err) {
                console.error(err);
            });

        // display.tools = [];
    }

    _postCreate() {
        const display = this.display;

        const domElements: PanelElements = {
            main: display.mainContainer,
            leftPanel: display.leftPanelPane,
            navigation: display.navigationMenuPane.domNode,
        };
        display.panelsManager.initDomElements(domElements);
        this._handleTinyDisplayMode();

        display._postCreateDeferred.resolve(true);
    }

    prepareItem(item: TreeItemConfig | RootItemConfig) {
        const display = this.display;
        const copy = {
            id: item.id,
            type: item.type,
            label: item.label,
        } as StoreItemConfig;

        if (item.type === "layer" && copy.type === "layer") {
            copy.layerId = item.layerId;
            copy.styleId = item.styleId;

            copy.visibility = null;
            copy.checked = item.visibility;
            copy.identifiable = item.identifiable;
            copy.position = item.drawOrderPosition;
        } else if (item.type === "root" && copy.type === "root") {
            copy.children = item.children.map((c) => {
                return this.prepareItem(c) as StoreGroupConfig;
            });
        } else if (item.type === "group" && copy.type === "group") {
            copy.children = item.children.map((c) => {
                return this.prepareItem(c) as StoreGroupConfig;
            });
        }

        display._itemConfigById[item.id] = item;
        return copy;
    }

    _mapAddControls(controls: Control[]) {
        controls.forEach((control) => {
            this.display.map.olMap.addControl(control);
        });
    }

    startup() {
        this._hideNavMenuForGuest();

        this.display._startupDeferred.resolve(true);
    }

    isTinyMode() {
        return this.display.tinyConfig !== undefined;
    }

    highlightGeometry(geometry: Geometry): void {
        this.display.map.zoomToFeature(new Feature({ geometry }));
        topic.publish("feature.highlight", {
            olGeometry: geometry,
        });
    }

    _mapAddLayer(id: number) {
        const layer = this.display.webmapStore.getLayer(id);
        this.display.map.addLayer(layer);
    }

    _getActiveBasemapKey() {
        if (!this.display._baseLayer || !this.display._baseLayer.name) {
            return "blank";
        }
        return this.display._baseLayer.name;
    }

    handleSelect(selectedKeys: number[]) {
        const display = this.display;
        if (selectedKeys.length === 0 || selectedKeys.length < 1) {
            return;
        }
        const itemId = selectedKeys[0];
        display.itemStore.fetchItemByIdentity({
            identity: itemId,
            onItem: (item) => {
                display.set("itemConfig", display._itemConfigById[itemId]);
                display.set("item", item);
            },
        });
    }

    setLayerZIndex(id: string, zIndex: number) {
        const layer = this.display.map.layers[id];
        if (layer && layer.olLayer && layer.olLayer.setZIndex) {
            layer.olLayer.setZIndex(zIndex);
        }
    }

    async getVisibleItems() {
        return new Promise((resolve, reject) => {
            const display = this.display;
            const store = display.itemStore;

            store.fetch({
                query: { type: "layer", visibility: true },
                sort: { attribute: "position" },
                queryOptions: { deep: true },
                onComplete: (items) => {
                    resolve(items);
                },
                onError: (error) => {
                    reject(error);
                },
            });
        });
    }

    dumpItem() {
        return this.display.itemStore.dumpItem(this.display.item);
    }

    getItemConfig() {
        return Object.assign({}, this.display._itemConfigById);
    }

    getUrlParams() {
        return this.display._urlParams;
    }

    private _hideNavMenuForGuest() {
        if (!this.display.clientSettings.hide_nav_menu || !ngwConfig.isGuest) {
            return;
        }

        const navMenu = document.querySelector("#header #menu") as HTMLElement;
        if (!navMenu) return;
        navMenu.style.display = "none";
    }

    private _adaptersSetup() {
        const display = this.display;
        display._adapters = {};

        Object.keys(display._mid.adapter).forEach((k) => {
            display._adapters[k] = new display._mid.adapter[k]({
                display,
            });
        });
    }

    private _layersSetup() {
        const display = this.display;
        const store = display.itemStore;
        let visibleStyles: number[] | null = null;

        this._adaptersSetup();

        // Layer index by id for backward compatibility
        Object.defineProperty(this, "_layers", {
            get: function () {
                console.log(
                    `display._layers wes deprecated use this.webmapStore._layers instead.`
                );
                return this.webmapStore._layers;
            },
        });
        display._layer_order = []; // Layers from back to front

        if (typeof display._urlParams.styles === "string") {
            visibleStyles = display._urlParams.styles
                .split(",")
                .map((i) => parseInt(i, 10));
        }

        // Layers initialization
        store.fetch({
            query: { type: "layer" },
            queryOptions: { deep: true },
            sort: display.config.drawOrderEnabled
                ? [
                      {
                          attribute: "position",
                      },
                  ]
                : null,
            onItem: (item) => {
                this._onNewStoreItem(item);

                // Turn on layers from permalink
                let cond;
                const layer = display.webmapStore.getLayer(
                    store.getValue(item, "id")
                );
                if (visibleStyles) {
                    cond =
                        visibleStyles.indexOf(
                            store.getValue(item, "styleId")
                        ) !== -1;

                    layer.olLayer.setVisible(cond);
                    layer.setVisibility(cond);
                    store.setValue(item, "checked", cond);
                }
            },
            onComplete: () => {
                display._layersDeferred.resolve(true);
            },
            onError: (error: Error) => {
                console.error(error);
                display._layersDeferred.reject(false);
            },
        });
    }

    private isTinyModePlugin(pluginKey: string) {
        const disabledPlugins = [
            "@nextgisweb/webmap/plugin/layer-editor",
            "@nextgisweb/webmap/plugin/feature-layer",
        ];
        return !disabledPlugins.includes(pluginKey);
    }

    private _installPlugins(
        plugins: Record<string, MapPlugin | { default: MapPlugin }>
    ) {
        const display = this.display;
        Object.keys(plugins).forEach((key) => {
            console.log("Plugin [%s]::constructor...", key);

            if (this.isTinyMode() && !this.isTinyModePlugin(key)) {
                return;
            }

            if (this.isTinyMode() && !this.isTinyModePlugin(key)) {
                return;
            }

            let pluginInfo = plugins[key];
            if (!pluginInfo) {
                return;
            }

            if ("default" in pluginInfo) {
                pluginInfo = pluginInfo.default;
            }

            const plugin = new pluginInfo({
                identity: key,
                display,
                itemStore: plugins ? false : display.itemStore,
            });

            display._postCreateDeferred.then(() => {
                console.log("Plugin [%s]::postCreate...", key);
                plugin.postCreate();

                display._startupDeferred.then(() => {
                    console.log("Plugin [%s]::startup...", key);
                    plugin.startup();

                    display._plugins[key] = plugin;
                    console.info("Plugin [%s] registered", key);
                });
            });
        });
    }

    private _onNewStoreItem(item: StoreItem) {
        const display = this.display;
        const store = display.itemStore;
        this._layerSetup(item);
        display._layer_order.unshift(store.getValue(item, "id"));
    }

    private _layerSetup(item: StoreItem) {
        const display = this.display;
        const store = display.itemStore;

        const data = display._itemConfigById[store.getValue(item, "id")];
        if (data.type === "layer") {
            const adapter = display._adapters[data.adapter];
            const metersPerUnit = display.map.olMap
                .getView()
                .getProjection()
                .getMetersPerUnit();
            if (metersPerUnit !== undefined) {
                if (data.maxScaleDenom !== null) {
                    const minResolution = display.map.getResolutionForScale(
                        data.maxScaleDenom,
                        metersPerUnit
                    );
                    if (minResolution !== undefined) {
                        data.minResolution = minResolution;
                    }
                }
                if (data.minScaleDenom !== null) {
                    const maxResolution = display.map.getResolutionForScale(
                        data.minScaleDenom,
                        metersPerUnit
                    );
                    if (maxResolution !== undefined) {
                        data.maxResolution = maxResolution;
                    }
                }
            }

            const layer = adapter.createLayer(data);

            layer.itemId = data.id;
            layer.itemConfig = data;

            display.webmapStore.addLayer(data.id, layer);
        }
    }

    private _buildLayersTree() {
        const display = this.display;
        const { expanded } = display.config.itemsStates;
        display.webmapStore.setWebmapItems(display.config.rootItem.children);
        display.webmapStore.setExpanded(expanded);
    }

    private _mapAddLayers() {
        this.display._layer_order.forEach((id) => {
            this._mapAddLayer(id);
        });
    }

    private _pluginsSetup(wmplugin?: boolean) {
        const display = this.display;

        if (!display._plugins) {
            display._plugins = {};
        }

        const plugins = wmplugin ? display._mid.wmplugin : display._mid.plugin;
        this._installPlugins(plugins);
    }

    private _layersPanelSetup() {
        const display = this.display;

        Promise.all([
            display._layersDeferred,
            display._mapDeferred,
            display._postCreateDeferred,
            display.panelsManager.panelsReady.promise,
        ])
            .then(() => {
                if (display._urlParams.base) {
                    this._switchBasemap(display._urlParams.base);
                }
                this._setMapExtent();
                display._mapExtentDeferred.resolve(true);
            })
            .then(undefined, function (err) {
                console.error(err);
            });
    }

    private _switchBasemap(basemapLayerKey: string) {
        const display = this.display;

        if (!(basemapLayerKey in display.map.layers)) {
            return false;
        }

        if (display._baseLayer && display._baseLayer.name) {
            const { name } = display._baseLayer;
            display.map.layers[name].olLayer.setVisible(false);
        }

        const newLayer = display.map.layers[basemapLayerKey];
        newLayer.olLayer.setVisible(true);
        display._baseLayer = newLayer;

        return true;
    }

    private _setMapExtent() {
        if (this._zoomByUrlParams()) return;
        this._zoomToInitialExtent();
    }
    _zoomToInitialExtent() {
        this.display.map.olMap.getView().fit(this.display._extent);
    }

    private _webmapStoreSetup() {
        this.display.webmapStore = new WebmapStore({
            itemStore: this.display.itemStore,
        });
    }

    private _itemStoreSetup() {
        const display = this.display;
        display._itemConfigById = {};
        const rootItem = this.prepareItem(display.config.rootItem);
        display.itemStore = new CustomItemFileWriteStore({
            data: {
                identifier: "id",
                label: "label",
                items: [rootItem],
            },
        });
    }

    private _itemStorePrepareItem(item: StoreItem) {
        this._itemStoreVisibility(item);
    }

    private _itemStoreVisibility(item: StoreItem) {
        const webmapStore = this.display.webmapStore;

        if (webmapStore) {
            webmapStore._itemStoreVisibility(item);
        }
    }

    private _itemStorePrepare() {
        const display = this.display;

        display.itemStore.fetch({
            queryOptions: { deep: true },
            onItem: (item) => {
                this._itemStorePrepareItem(item);
            },
            onComplete: () => {
                display._itemStoreDeferred.resolve(true);
            },
            onError: (error: Error) => {
                console.error(error);
                display._itemStoreDeferred.reject(false);
            },
        });
    }

    _mapSetup() {
        this.display.mapToolbar = new MapToolbar({
            display: this.display,
            target: this.display.leftBottomControlPane,
        });

        this.display.map = new Map({
            target: this.display.mapNode,
            logo: false,
            controls: [],
            view: new View({
                minZoom: 3,
                constrainResolution: true,
                // TODO: Investigate the source of null values. Normal extent from API types without nulls.
                extent: !(
                    this.display.config.extent_const as (null | number)[]
                ).includes(null)
                    ? this.display._extent_const
                    : undefined,
            }),
        });

        const controlsReady = buildControls(this.display);

        if (controlsReady.has("id")) {
            const { control } = controlsReady.get("id")! as any;
            this.display.identify = control;
            this.display.mapStates.addState(
                "identifying",
                this.display.identify
            );
            this.display.mapStates.setDefaultState("identifying", true);
            this._identifyFeatureByAttrValue();
        }

        topic.publish("/webmap/tools/initialized", true);

        // Resize OpenLayers Map on container resize
        this.display.mapPane.on("resize", () => {
            this.display.map.olMap.updateSize();
        });

        // Basemaps initialization
        const settings = this.display.clientSettings;
        let idx = 0;

        for (const bm of settings.basemaps) {
            const MID = this.display._mid.basemap[bm.base.mid];

            const baseOptions = { ...bm.base };
            const layerOptions = { ...bm.layer };
            const sourceOptions = { ...bm.source };

            if (baseOptions.keyname === undefined) {
                baseOptions.keyname = `basemap_${idx}`;
            }

            try {
                const layer = new MID(
                    baseOptions.keyname,
                    layerOptions,
                    sourceOptions
                );

                if (layer.olLayer.getVisible()) {
                    this.display._baseLayer = layer;
                }
                layer.isBaseLayer = true;
                this.display.map.addLayer(layer);
            } catch (err) {
                console.warn(
                    `Can't initialize layer [${baseOptions.keyname}]: ${err}`
                );
            }

            idx++;
        }

        appendTo(this.display.mapNode);
        this.display._mapDeferred.resolve(true);
    }

    _zoomByUrlParams(): boolean {
        const urlParams = this.display._urlParams;

        if (
            !("zoom" in urlParams && "lon" in urlParams && "lat" in urlParams)
        ) {
            return false;
        }

        const view = this.display.map.olMap.getView();
        if (urlParams.lon && urlParams.lat) {
            view.setCenter(
                fromLonLat([
                    parseFloat(urlParams.lon),
                    parseFloat(urlParams.lat),
                ])
            );
        }
        if (urlParams.zoom !== undefined) {
            view.setZoom(parseInt(urlParams.zoom));
        }

        if ("angle" in urlParams && urlParams.angle !== undefined) {
            view.setRotation(parseFloat(urlParams.angle));
        }

        return true;
    }

    _initializeFeatureHighlighter() {
        return new FeatureHighlighter(this.display.map);
    }

    private _initializeMids() {
        const mids = this.display.config.mid;

        const basemapMids: [
            name: string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mid: () => Promise<{ default: typeof BaseLayer<any, any, any> }>,
        ][] = [
            [
                "@nextgisweb/webmap/ol/layer/OSM",
                () => import("@nextgisweb/webmap/ol/layer/OSM"),
            ],
            [
                "@nextgisweb/webmap/ol/layer/XYZ",
                () => import("@nextgisweb/webmap/ol/layer/XYZ"),
            ],
            [
                "@nextgisweb/webmap/ol/layer/QuadKey",
                () => import("@nextgisweb/webmap/ol/layer/QuadKey"),
            ],
        ];

        mids.basemap.push(...basemapMids);

        for (const key in mids) {
            const midarr = mids[key as keyof typeof mids];

            const deferred = new LoggedDeferred(`_midDeferred.${key}`);
            this.display._midDeferred[key] = deferred;

            entrypointsLoader(midarr).then((obj) => {
                this.display._mid[key] = obj;
                deferred.resolve(obj);
            });
        }
    }

    private _buildPanelsManager() {
        const activePanelKey = this.display._urlParams[this.modeURLParam];
        const onChangePanel = (panel?: PanelDojoItem) => {
            if (panel) {
                setURLParam(this.modeURLParam, panel.name);
            } else {
                setURLParam(this.modeURLParam, this.emptyModeURLValue);
            }
        };

        let allowPanels;
        if (this.isTinyMode()) {
            const panels = this.display._urlParams.panels;
            allowPanels = panels ? panels.split(",") : [];
        }

        this.display.panelsManager = new PanelsManager(
            this.display,
            activePanelKey,
            allowPanels,
            onChangePanel
        );

        this._buildPanels();
    }

    private async _buildPanels() {
        await Promise.all([
            this.display._layersDeferred,
            this.display._postCreateDeferred,
        ]);
        try {
            makePanels({ display: this.display });
        } catch (err) {
            console.error(err);
        }
    }

    private _identifyFeatureByAttrValue() {
        const display = this.display;

        const urlParams = display._urlParams;

        if (
            !(
                urlParams.hl_lid !== undefined &&
                urlParams.hl_attr !== undefined &&
                urlParams.hl_val !== undefined
            )
        ) {
            return;
        }

        display.identify
            .identifyFeatureByAttrValue(
                Number(urlParams.hl_lid),
                urlParams.hl_attr,
                urlParams.hl_val,
                urlParams.zoom !== undefined
                    ? Number(urlParams.zoom)
                    : undefined
            )
            .then((result) => {
                if (result) return;
                errorModal({
                    title: gettext("Object not found"),
                    message: gettext("Object from URL parameters not found"),
                });
            });
    }

    private _addLinkToMainMap() {
        const display = this.display;
        if (display._urlParams.linkMainMap !== "true") {
            return;
        }
        display.map.olMap.addControl(
            new LinkToMainMap({
                url: display.tinyConfig.mainDisplayUrl,
                target: display.rightTopControlPane,
                tipLabel: gettext("Open full map"),
            })
        );
    }

    private _buildTinyPanels() {
        const display = this.display;
        if (!display.panelsManager.getPanelsCount()) {
            return;
        }

        display.domNode.classList.add("tiny-panels");
        const activePanel = display.panelsManager.getActivePanelName();
        if (!activePanel) {
            return;
        }
        display.panelsManager.deactivatePanel();
        display.panelsManager.activatePanel(activePanel);
    }

    private _handleTinyDisplayMode() {
        const display = this.display;

        if (!this.isTinyMode()) {
            return;
        }

        display.domNode.classList.add("tiny");

        Promise.all([
            display._layersDeferred,
            display._mapDeferred,
            display._postCreateDeferred,
            display.panelsManager.panelsReady.promise,
        ])
            .then(() => {
                this._buildTinyPanels();
                this._addLinkToMainMap();
                this._handlePostMessage();
            })
            .then(undefined, function (err) {
                console.error(err);
            });
    }

    /**
     * Generate window `message` events to listen from iframe
     * @example
     * window.addEventListener('message', function(evt) {
     *    const data = evt.data;
     *    if (data.event === 'ngMapExtentChanged') {
     *        if (data.detail === 'zoom') {
     *        } else if (data.detail === 'move') {
     *        }
     *        // OR
     *        if (data.detail === 'position') {}
     *    }
     * }, false);
     */
    _handlePostMessage() {
        handlePostMessage(this.display);
    }
}
