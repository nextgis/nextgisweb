import { useCallback, useEffect, useMemo, useState } from "react";

import {
    Alert,
    Button,
    Input,
    InputNumber,
    Space,
    Switch,
} from "@nextgisweb/gui/antd";
import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { getPermalink } from "@nextgisweb/webmap/utils/permalink";

import settings from "@nextgisweb/pyramid/settings!";

import CloseIcon from "@nextgisweb/icon/material/close";
import PreviewIcon from "@nextgisweb/icon/material/preview";

import "./SharePanel.less";
import { PanelHeader } from "../header";

const makeIframeTag = (iframeSrc, height, width) => {
    return (
        `<iframe src="${iframeSrc}" ` +
        `style="overflow:hidden;height:${height}px;width:${width}px" ` +
        `height="${height}" width="${width}"></iframe>`
    );
};

const regexLink = /(.+)?<a>(.*?)<\/a>(.+)?/;

const makeCORSWarning = () => {
    // prettier-ignore
    const caption = gettext("<a>CORS</a> must be enabled for the target origin when embedding a web map on a different domain.");
    if (!regexLink.test(caption)) {
        return <></>;
    }
    const [_all, pre, refText, post] = regexLink.exec(caption);
    const message = (
        <span>
            {pre}
            <a href={routeURL("pyramid.control_panel.cors")} target="_blank">
                {refText}
            </a>
            {post}
        </span>
    );

    return <Alert message={message} type="warning" />;
};

function CodeArea(props) {
    return (
        <Input.TextArea
            style={{ wordBreak: "break-all", overflow: "hidden" }}
            spellCheck={false}
            {...props}
        />
    );
}

export const SharePanel = ({ display, title, close }) => {
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
    }, []);

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

    const CORSWarning = useMemo(() => makeCORSWarning(), []);
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

                {settings["check_origin"] && CORSWarning}

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
            </section>
        </div>
    );
};
