import { useCallback, useEffect, useState } from "react";

import {
    Alert,
    Button,
    Input,
    InputNumber,
    Space,
    Switch,
} from "@nextgisweb/gui/antd";
import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { TemplateLink } from "@nextgisweb/gui/component";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!";
import { getPermalink } from "@nextgisweb/webmap/utils/permalink";

import { PanelHeader } from "../header";

import CloseIcon from "@nextgisweb/icon/material/close";
import PreviewIcon from "@nextgisweb/icon/material/preview";

import "./SharePanel.less";

// prettier-ignore
const msgCORS = gettext("<a>CORS</a> must be enabled for the target origin when embedding a web map on a different domain.");

const makeIframeTag = (iframeSrc, height, width) => {
    return (
        `<iframe src="${iframeSrc}" ` +
        `style="overflow:hidden;height:${height}px;width:${width}px" ` +
        `height="${height}" width="${width}"></iframe>`
    );
};

function CORSWarning() {
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
}

function CodeArea(props) {
    return (
        <Input.TextArea
            style={{ wordBreak: "break-all", overflow: "hidden" }}
            spellCheck={false}
            {...props}
        />
    );
}

export const SharePanel = ({ display, title, close, visible }) => {
    const webmapId = display.config.webmapId;

    const [mapLink, setMapLink] = useState("");
    const [widthMap, setWidthMap] = useState(600);
    const [heightMap, setHeightMap] = useState(400);
    const [addLinkToMap, setAddLinkToMap] = useState(true);
    const [generateEvents, setGenerateEvents] = useState(false);
    const [embedCode, setEmbedCode] = useState("");

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
    }, [widthMap, heightMap, addLinkToMap, generateEvents]);

    const previewUrl = routeURL("webmap.preview_embedded", webmapId);

    return (
        <div className="ngw-webmap-share-panel">
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
                <div className="input-group">
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
