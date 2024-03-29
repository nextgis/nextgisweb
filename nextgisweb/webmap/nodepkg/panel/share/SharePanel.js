import orderBy from "lodash-es/orderBy";
import { useCallback, useEffect, useState } from "react";

import {
    Alert,
    Button,
    Input,
    InputNumber,
    Select,
    Space,
    Switch,
} from "@nextgisweb/gui/antd";
import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { TemplateLink } from "@nextgisweb/gui/component";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!";
import { getControls } from "@nextgisweb/webmap/map-controls";
import { getPermalink } from "@nextgisweb/webmap/utils/permalink";

import { PanelHeader } from "../header";

import CloseIcon from "@nextgisweb/icon/material/close";
import PreviewIcon from "@nextgisweb/icon/material/preview";

import "./SharePanel.less";
import "../styles/panels.less";

// prettier-ignore
const msgCORS = gettext("<a>CORS</a> must be enabled for the target origin when embedding a web map on a different domain.");

const makeIframeTag = (iframeSrc, height, width) => {
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

const CodeArea = (props) => {
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

const ToolsSelect = (props) => {
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

const PanelsSelect = (props) => {
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
const ActivePanelSelect = ({ panelsOptions, onChange, activePanel }) => {
    const NoneOption = {
        label: gettext("None"),
        value: "none",
    };
    const options = [NoneOption, ...panelsOptions];

    return (
        <Select
            style={{
                width: "100%",
            }}
            options={options}
            onChange={onChange}
            value={activePanel}
        />
    );
};

const PanelTitle = ({ panelInfo }) => {
    return (
        <div className="panel-title">
            <div>
                <svg className="icon" fill="currentColor">
                    <use xlinkHref={`#icon-${panelInfo.menuIcon}`} />
                </svg>
            </div>
            <div className="title">{panelInfo.title}</div>
        </div>
    );
};

export const SharePanel = ({ display, title, close, visible }) => {
    const webmapId = display.config.webmapId;

    const [mapLink, setMapLink] = useState("");
    const [widthMap, setWidthMap] = useState(800);
    const [heightMap, setHeightMap] = useState(600);
    const [addLinkToMap, setAddLinkToMap] = useState(true);
    const [generateEvents, setGenerateEvents] = useState(false);
    const [embedCode, setEmbedCode] = useState("");
    const [controls, setControls] = useState([]);
    const [panelsOptions, setPanelsOptions] = useState([]);
    const [panels, setPanels] = useState([]);
    const [activePanel, setActivePanel] = useState(DEFAULT_ACTIVE_PANEL);

    const updatePermalinkUrl = () => {
        display.getVisibleItems().then((visibleItems) => {
            const permalink = getPermalink(display, visibleItems);
            setMapLink(decodeURIComponent(permalink));
        });
    };

    const updateEmbedCode = () => {
        display.getVisibleItems().then((visibleItems) => {
            const permalinkOptions = {
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
            };
            const iframeSrc = getPermalink(
                display,
                visibleItems,
                permalinkOptions
            );
            const embedCode = makeIframeTag(iframeSrc, heightMap, widthMap);
            setEmbedCode(embedCode);
        });
    };

    const updateTexts = useCallback(() => {
        display._mapExtentDeferred.then(() => {
            updatePermalinkUrl();
            updateEmbedCode();
        });
    }, [visible]);

    useEffect(() => {
        display.map.olMap.getView().on("change", updateTexts);
        const listener = display.itemStore.on("Set", updateTexts);
        updateTexts();
        return () => {
            display.map.olMap.getView().un("change", updateTexts);
            listener.remove();
        };
    }, [updateTexts]);

    useEffect(() => {
        display._mapExtentDeferred.then(() => {
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
                        label: <PanelTitle panelInfo={p} />,
                        value: p.name,
                    };
                });
            setPanelsOptions(orderBy(panelsForTinyMap, "label", "asc"));
        });
    }, [display]);

    const previewUrl = routeURL("webmap.preview_embedded", webmapId);

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

    return (
        <div className="ngw-panel ngw-webmap-share-panel">
            <PanelHeader {...{ title, close }} />
            <section>
                <h5 className="heading">{gettext("Map link")}</h5>
                <div className="input-group">
                    <CodeArea value={mapLink} />
                </div>
                <CopyToClipboardButton
                    getTextToCopy={() => mapLink}
                    messageInfo={gettext("The map link copied to clipboard.")}
                >
                    {gettext("Copy link")}
                </CopyToClipboardButton>
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
                        onChange={(v) => setWidthMap(v)}
                    />
                    <CloseIcon />
                    <InputNumber
                        title={gettext("Height, px")}
                        value={heightMap}
                        onChange={(v) => setHeightMap(v)}
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
};
