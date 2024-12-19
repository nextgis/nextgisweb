import type { TextAreaProps } from "antd/es/input";
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
import type { InputRef, OptionType, SelectProps } from "@nextgisweb/gui/antd";
import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { TemplateLink } from "@nextgisweb/gui/component";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!webmap";
import { useFavorites } from "@nextgisweb/resource/favorite/useFavorites";
import { getControls } from "@nextgisweb/webmap/map-controls";
import type { PanelPlugin } from "@nextgisweb/webmap/panels-manager/registry";
import type { PanelComponentProps } from "@nextgisweb/webmap/panels-manager/type";
import { getPermalink } from "@nextgisweb/webmap/utils/permalink";

import { PanelHeader } from "../header";

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

const toolsOptions = getControls()
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

const PanelTitle = ({ panelInfo }: { panelInfo: PanelPlugin }) => {
    return (
        <div className="panel-title">
            <div>
                {typeof panelInfo.menuIcon === "string" ? (
                    <svg className="icon" fill="currentColor">
                        <use xlinkHref={`#icon-${panelInfo.menuIcon}`} />
                    </svg>
                ) : (
                    panelInfo.menuIcon
                )}
            </div>
            <div className="title">{panelInfo.title}</div>
        </div>
    );
};

interface PanelOption {
    label: React.ReactNode;
    title: string;
    value: string;
}

const SharePanel = observer(
    ({ display, title, close, visible }: PanelComponentProps) => {
        const webmapId = display.config.webmapId;

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
            visible,
            display.mapExtentDeferred,
            display.itemStore,
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
            display.panelsManager.panelsReady.promise.then(() => {
                const panelsForTinyMap = display.panelsManager
                    .getPanels()
                    .filter((p) => p.applyToTinyMap === true)
                    .map((p) => {
                        return {
                            title: p.title,
                            label: <PanelTitle panelInfo={p} />,
                            value: p.name,
                        };
                    })
                    .sort((a, b) => a.title.localeCompare(b.title));
                setPanelsOptions(panelsForTinyMap);
            });
        }, [display]);

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
            <div className="ngw-panel ngw-webmap-share-panel">
                <PanelHeader title={title} close={close} />
                <section>
                    <h5 className="heading">{gettext("Map link")}</h5>
                    <div className="input-group">
                        <CodeArea value={mapLink} />
                    </div>
                    {favorites.contextHolder}
                    <Space.Compact>
                        <CopyToClipboardButton
                            getTextToCopy={() => mapLink}
                            messageInfo={gettext(
                                "The map link copied to clipboard."
                            )}
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
                            ></Input>
                        </Modal>
                    )}
                </section>
                <section>
                    <h5 className="heading">
                        {gettext("Embed code for your site")}
                    </h5>

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
                            checked={addLinkToMap}
                            onChange={(v) => setAddLinkToMap(v)}
                        />
                        <span className="checkbox__label">
                            {gettext("Link to main map")}
                        </span>
                    </div>
                    <div className="input-group">
                        <Switch
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
                </section>
            </div>
        );
    }
);

SharePanel.displayName = "SharePanel";

export default SharePanel;
