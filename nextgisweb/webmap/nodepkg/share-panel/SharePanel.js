import { useCallback, useEffect, useMemo, useState } from "react";

import {
    Alert,
    Button,
    Input,
    InputNumber,
    Switch,
} from "@nextgisweb/gui/antd";
import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { getPermalink } from "@nextgisweb/webmap/utils/permalink";

import settings from "@nextgisweb/pyramid/settings!";

import CloseIcon from "@material-icons/svg/close";
import PreviewIcon from "@material-icons/svg/preview";

import "./SharePanel.less";

let itemStoreListener;

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

export const SharePanel = ({ display, eventVisibility }) => {
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
                    routeURL("webmap.display.tiny", display.config.webmapId),
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
        updatePermalinkUrl();
        updateEmbedCode();
    }, []);

    const handleShow = () => {
        display.map.olMap.getView().on("change", updateTexts);
        itemStoreListener = display.itemStore.on("Set", updateTexts);
        updateTexts();
    };

    const handleHide = () => {
        display.map.olMap.getView().un("change", updateTexts);
        if (itemStoreListener) {
            itemStoreListener.remove();
        }
    };

    useEffect(() => {
        updateEmbedCode();
    }, [widthMap, heightMap, addLinkToMap, generateEvents]);

    useEffect(() => {
        if (eventVisibility === "pre-show") {
            handleShow();
        }
        if (eventVisibility === "pre-hide") {
            handleHide();
        }
    }, [eventVisibility]);

    const CORSWarning = useMemo(() => makeCORSWarning(), []);

    return (
        <div className="share-panel">
            <h5 className="heading">{gettext("Map link")}</h5>
            <div className="input-group">
                <Input.TextArea value={mapLink} />
            </div>
            <CopyToClipboardButton
                type="secondary"
                getTextToCopy={() => mapLink}
                messageInfo={gettext("The map link copied to clipboard.")}
            >
                {gettext("Copy link")}
            </CopyToClipboardButton>

            <div className="divider"></div>

            <h5 className="heading">{gettext("Embed code for your site")}</h5>

            {settings["check_origin"] && CORSWarning}

            <div className="input-group input-group--inline">
                <span className="input-group__label">
                    {gettext("Map size:")}
                </span>
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
                <span className="input-group__label">{gettext("px")}</span>
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
                <Input.TextArea value={embedCode} />
            </div>

            <CopyToClipboardButton
                type="secondary"
                getTextToCopy={() => embedCode}
                messageInfo={gettext("The embed code copied to clipboard.")}
            >
                {gettext("Copy code")}
            </CopyToClipboardButton>
            <div className="divider"></div>

            <h5 className="heading">{gettext("Preview")}</h5>
            <form
                action={routeURL(
                    "webmap.preview_embedded",
                    display.config.webmapId
                )}
                method="POST"
                target="_blank"
            >
                <input
                    type="hidden"
                    name="iframe"
                    value={encodeURI(embedCode)}
                />
                <Button type="primary" htmlType="submit" icon={<PreviewIcon />}>
                    {gettext("Preview")}
                </Button>
            </form>
        </div>
    );
};
