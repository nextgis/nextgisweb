import { debounce } from "lodash-es";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

import {
    Alert,
    Button,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Switch,
    Tooltip,
} from "@nextgisweb/gui/antd";
import type {
    InputRef,
    OptionType,
    SelectProps,
    TextAreaProps,
} from "@nextgisweb/gui/antd";
import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { TemplateLink } from "@nextgisweb/gui/component";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useFavorites } from "@nextgisweb/resource/favorite/useFavorites";
import settings from "@nextgisweb/webmap/client-settings";
import { registry } from "@nextgisweb/webmap/display/component/map-panel/registry";
import type { PanelStore } from "@nextgisweb/webmap/panel";
import { getPermalink } from "@nextgisweb/webmap/utils/permalink";

import { PanelContainer, PanelSection } from "../component";
import type { PanelPluginWidgetProps } from "../registry";

import CloseIcon from "@nextgisweb/icon/material/close";
import PreviewIcon from "@nextgisweb/icon/material/preview";
import FavoriteIcon from "@nextgisweb/icon/material/star";

import "../styles/panels.less";
import "./SharePanel.less";

// prettier-ignore
const msgCORS = gettext("<a>CORS</a> must be enabled for the target origin when embedding a web map on a different domain.");
const msgAddFragmentToFavorites = gettext("Add web map fragment to favorites");

const makeIframeTag = (iframeSrc: string, height: number, width: number) => {
    return (
        `<iframe src="${iframeSrc}" ` +
        `style="overflow:hidden;height:${height}px;width:${width}px" ` +
        `height="${height}" width="${width}"></iframe>`
    );
};

const CORSWarning = () => {
    if (!settings["check_origin"]) return <></>;
    return (
        <Alert
            type="warning"
            message={
                <TemplateLink
                    template={msgCORS}
                    link={routeURL("pyramid.control_panel.cors")}
                    target="_blank"
                />
            }
        />
    );
};

const CodeArea = (props: TextAreaProps) => {
    return (
        <Input.TextArea
            style={{ wordBreak: "break-all", overflow: "hidden" }}
            spellCheck={false}
            {...props}
        />
    );
};

const toolsOptions = registry
    .queryAll()
    .filter((c) => c.embeddedShowMode === "customize")
    .map((c) => {
        return {
            label: c.label,
            value: c.key,
        };
    });

const ToolsSelect = (props: SelectProps) => {
    return (
        <Select
            mode="multiple"
            allowClear
            style={{
                width: "100%",
            }}
            placeholder={gettext("Select tools")}
            options={toolsOptions}
            {...props}
        />
    );
};

const PanelsSelect = (props: SelectProps) => {
    return (
        <Select
            mode="multiple"
            allowClear
            style={{
                width: "100%",
            }}
            {...props}
            placeholder={gettext("Select panels")}
        />
    );
};

const DEFAULT_ACTIVE_PANEL = "none";
const ActivePanelSelect = ({
    panelsOptions,
    onChange,
    activePanel,
}: {
    panelsOptions: OptionType[];
    onChange: (val: string) => void;
    activePanel: string;
}) => {
    const NoneOption = {
        label: gettext("None"),
        value: "none",
    };
    const options: OptionType[] = [NoneOption, ...panelsOptions];

    return (
        <Select<string>
            style={{
                width: "100%",
            }}
            options={options}
            onChange={onChange}
            value={activePanel}
        />
    );
};

const PanelTitle = ({ panel }: { panel: PanelStore }) => {
    return (
        <div className="panel-title">
            <div>{panel.icon}</div>
            <div className="title">{panel.title}</div>
        </div>
    );
};

interface PanelOption {
    label: React.ReactNode;
    title: string;
    value: string;
}

const SharePanel = observer<PanelPluginWidgetProps>(({ store, display }) => {
    const webmapId = display.config.webmapId;
    const { panelManager } = display;
    const [mapLink, setMapLink] = useState("");
    const [widthMap, setWidthMap] = useState(800);
    const [heightMap, setHeightMap] = useState(600);
    const [addLinkToMap, setAddLinkToMap] = useState(true);
    const [generateEvents, setGenerateEvents] = useState(false);
    const [embedCode, setEmbedCode] = useState("");
    const [controls, setControls] = useState<string[]>([]);
    const [panelsOptions, setPanelsOptions] = useState<PanelOption[]>([]);
    const [panels, setPanels] = useState<string[]>([]);
    const [activePanel, setActivePanel] = useState(DEFAULT_ACTIVE_PANEL);

    const [favLabelModalOpen, setFavLabelModalOpen] = useState(false);
    const favLabelRef = useRef<InputRef>(null);
    const [favLabelValue, setFavlabelValue] = useState("");

    const updatePermalinkUrl = useCallback(() => {
        display.getVisibleItems().then((visibleItems) => {
            const permalink = getPermalink({ display, visibleItems });
            setMapLink(decodeURIComponent(permalink));
        });
    }, [display]);

    const updateEmbedCode = useCallback(() => {
        display.getVisibleItems().then((visibleItems) => {
            const iframeSrc = getPermalink({
                display,
                visibleItems,
                urlWithoutParams:
                    ngwConfig.applicationUrl +
                    routeURL("webmap.display.tiny", webmapId),
                additionalParams: {
                    linkMainMap: addLinkToMap,
                    events: generateEvents,
                    panel: activePanel,
                    controls,
                    panels,
                },
            });
            const embedCode = makeIframeTag(iframeSrc, heightMap, widthMap);
            setEmbedCode(embedCode);
        });
    }, [
        activePanel,
        addLinkToMap,
        controls,
        display,
        generateEvents,
        heightMap,
        panels,
        webmapId,
        widthMap,
    ]);

    useEffect(() => {
        let isMounted = true;

        const updateTexts = debounce(() => {
            display.mapExtentDeferred.then(() => {
                if (!isMounted) return;
                updatePermalinkUrl();
                updateEmbedCode();
            });
        });

        const mapView = display.map.olMap.getView();
        mapView.on("change", updateTexts);
        const listener = display.itemStore.on("Set", updateTexts);

        updateTexts();

        return () => {
            isMounted = false;
            mapView.un("change", updateTexts);
            listener.remove();
        };
    }, [
        display.mapExtentDeferred,
        display.itemStore,
        display.map.baseLayer,
        display.map.olMap,
        updateEmbedCode,
        updatePermalinkUrl,
    ]);

    useEffect(() => {
        display.mapExtentDeferred.then(() => {
            updateEmbedCode();
        });
    }, [
        widthMap,
        heightMap,
        addLinkToMap,
        generateEvents,
        controls,
        panels,
        activePanel,
        display.map.baseLayer,
        display.mapExtentDeferred,
        updateEmbedCode,
    ]);

    useEffect(() => {
        if (panels.length) {
            if (activePanel !== DEFAULT_ACTIVE_PANEL) {
                const found = panels.find((p) => p === activePanel);
                if (!found) {
                    setActivePanel(DEFAULT_ACTIVE_PANEL);
                }
            }
        } else {
            setActivePanel(DEFAULT_ACTIVE_PANEL);
        }
    }, [panels, activePanel]);

    useEffect(() => {
        if (panelManager.ready) {
            const panelsForTinyMap = panelManager
                .sorted()
                .filter((p) => p.applyToTinyMap === true)
                .map((p) => {
                    return {
                        title: p.title,
                        label: <PanelTitle panel={p} />,
                        value: p.name,
                    };
                })
                .sort((a, b) => a.title.localeCompare(b.title));
            setPanelsOptions(panelsForTinyMap);
        }
    }, [panelManager, panelManager.ready]);

    const previewUrl = routeURL("webmap.preview_embedded");

    let activePanelSelect;
    if (panels.length) {
        const activePanelsOptions = panelsOptions.filter((o) =>
            panels.includes(o.value)
        );
        activePanelSelect = (
            <div className="input-group column">
                <label>{gettext("Active panel")}</label>
                <ActivePanelSelect
                    panelsOptions={activePanelsOptions}
                    onChange={setActivePanel}
                    activePanel={activePanel}
                />
            </div>
        );
    }

    const favorites = useFavorites({ resource: { id: webmapId } });
    const addToFavorites = useCallback(
        (link: string, name: string | null) => {
            favorites.add({
                identity: "webmap.fragment",
                query_string: link.slice(link.indexOf("?") + 1),
                label: name || null,
            });
        },
        [favorites]
    );

    return (
        <PanelContainer title={store.title} close={store.close}>
            <PanelSection flex>
                <CodeArea value={mapLink} />
                {favorites.contextHolder}
                <Space.Compact>
                    <CopyToClipboardButton
                        getTextToCopy={() => mapLink}
                        messageInfo={
                            // pretties-ignore
                            gettext("The map link copied to clipboard.")
                        }
                    >
                        {gettext("Copy link")}
                    </CopyToClipboardButton>
                    {!ngwConfig.isGuest && (
                        <Tooltip title={msgAddFragmentToFavorites}>
                            <Button
                                onClick={() => setFavLabelModalOpen(true)}
                                icon={<FavoriteIcon />}
                            />
                        </Tooltip>
                    )}
                </Space.Compact>
                {!ngwConfig.isGuest && (
                    <Modal
                        title={msgAddFragmentToFavorites}
                        closeIcon={false}
                        open={favLabelModalOpen}
                        afterOpenChange={(open) => {
                            if (open && favLabelRef.current) {
                                favLabelRef.current.focus();
                            }
                        }}
                        onCancel={() => {
                            setFavLabelModalOpen(false);
                            setFavlabelValue("");
                        }}
                        onOk={() => {
                            addToFavorites(mapLink, favLabelValue);
                            setFavLabelModalOpen(false);
                            setFavlabelValue("");
                        }}
                    >
                        <Input
                            ref={favLabelRef}
                            value={favLabelValue}
                            placeholder={gettext("Optional fragment label")}
                            onChange={(e) => {
                                setFavlabelValue(e.target.value);
                            }}
                        />
                    </Modal>
                )}
            </PanelSection>
            <PanelSection title={gettext("Embed code for your site")} flex>
                <div className="input-group">
                    <span className="grow">{gettext("Map size:")}</span>
                    <InputNumber
                        title={gettext("Width, px")}
                        value={widthMap}
                        onChange={(v) => {
                            if (v !== null) setWidthMap(v);
                        }}
                    />
                    <CloseIcon />
                    <InputNumber
                        title={gettext("Height, px")}
                        value={heightMap}
                        onChange={(v) => {
                            if (v !== null) setHeightMap(v);
                        }}
                    />
                    <span>{gettext("px")}</span>
                </div>
                <div className="input-group column">
                    <label>{gettext("Map tools")}</label>
                    <ToolsSelect value={controls} onChange={setControls} />
                </div>
                <div className="input-group column">
                    <label>{gettext("Panels")}</label>
                    <PanelsSelect
                        value={panels}
                        options={panelsOptions}
                        onChange={setPanels}
                        className="panels-select"
                    />
                </div>
                {activePanelSelect}
                <div className="input-group">
                    <Switch
                        size="small"
                        checked={addLinkToMap}
                        onChange={(v) => setAddLinkToMap(v)}
                    />
                    <span className="checkbox__label">
                        {gettext("Link to main map")}
                    </span>
                </div>
                <div className="input-group">
                    <Switch
                        size="small"
                        checked={generateEvents}
                        onChange={(v) => setGenerateEvents(v)}
                    />
                    <span className="checkbox__label">
                        {gettext("Generate events")}
                    </span>
                </div>
                <div className="input-group  column">
                    <label>{gettext("Embed code")}</label>
                    <CodeArea value={embedCode} rows={4} />
                </div>
                <form action={previewUrl} method="POST" target="_blank">
                    <input
                        type="hidden"
                        name="iframe"
                        value={encodeURI(embedCode)}
                    />
                    <Space.Compact>
                        <CopyToClipboardButton
                            getTextToCopy={() => embedCode}
                            messageInfo={gettext(
                                "The embed code copied to clipboard."
                            )}
                        >
                            {gettext("Copy code")}
                        </CopyToClipboardButton>
                        <Button icon={<PreviewIcon />} htmlType="submit">
                            {gettext("Preview")}
                        </Button>
                    </Space.Compact>
                </form>
                <CORSWarning />
            </PanelSection>
        </PanelContainer>
    );
});

SharePanel.displayName = "SharePanel";
export default SharePanel;
