import {useEffect, useMemo, useState, useCallback} from "react";
import {Alert, Button, Input, InputNumber, Switch} from "@nextgisweb/gui/antd";
import {CopyToClipboardButton} from "@nextgisweb/gui/buttons";
import {PropTypes} from "prop-types";

import CloseIcon from "@material-icons/svg/close";
import PreviewIcon from "@material-icons/svg/preview";

import {routeURL} from "@nextgisweb/pyramid/api";
import {getPermalink} from "@nextgisweb/webmap/utils/permalink";

import i18n from "@nextgisweb/pyramid/i18n!webmap";
import settings from "@nextgisweb/pyramid/settings!";

import "./SharePanel.less";

let itemStoreListener;
const previewMapUrl = displayConfig.testEmbeddedMapUrl;

const makeIframeTag = (iframeSrc, height, width) => {
    return `<iframe src="${iframeSrc}" ` +
        `style="overflow:hidden;height:${height}px;width:${width}px" ` +
        `height="${height}" width="${width}"></iframe>`;
};

const makeSocialLinks = () => {
    const windowLocationUrl = window.location.href;

    const fbUrl = `https://www.facebook.com/sharer.php?u=${windowLocationUrl}&amp;display=popup&amp;caption=An%20example%20caption`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${windowLocationUrl}&amp;via=nextgis&amp;hashtags=nextgis`;
    const vkUrl = `https://vk.com/share.php?url=${windowLocationUrl}`;

    return <>
        <h5 className="heading">
            {i18n.gettext("Social networks")}
        </h5>
        <div className="social-links">
            <a href={fbUrl} className="social-link" target="_blank">
                <svg className="icon icon-l" fill="currentColor">
                    <use xlinkHref="#icon-webmap-share_facebook"/>
                </svg>
            </a>
            <a href={twitterUrl} className="social-link" target="_blank">
                <svg className="icon icon-l" fill="currentColor">
                    <use xlinkHref="#icon-webmap-share_twitter"/>
                </svg>
            </a>
            <a href={vkUrl} className="social-link" target="_blank">
                <svg className="icon icon-l" fill="currentColor">
                    <use xlinkHref="#icon-webmap-share_vkontakte"/>
                </svg>
            </a>
        </div>
        <div className="divider"></div>
    </>;
};

const regexLink = /(.+)?<a>(.*?)<\/a>(.+)?/;

const makeCORSWarning = () => {
    const caption = i18n.gettext("<a>CORS</a> must be enabled for the target origin when embedding a web map on a different domain.");
    if (!regexLink.test(caption)) {
        return <></>;
    }
    const [all, pre, refText, post] = regexLink.exec(caption);
    const message = <span>
        {pre}
        <a href={routeURL("pyramid.control_panel.cors")} target="_blank">{refText}</a>
        {post}
    </span>;

    return <Alert message={message} type="warning"/>;
};

export const SharePanel = ({display, socialNetworksEnabled, eventVisibility}) => {
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
                urlWithoutParams: displayConfig.tinyDisplayUrl,
                additionalParams: {
                    linkMainMap: addLinkToMap,
                    events: generateEvents
                }
            };
            const iframeSrc = getPermalink(display, visibleItems, permalinkOptions);
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

    const socialLinks = useMemo(() => makeSocialLinks(), []);
    const CORSWarning = useMemo(() => makeCORSWarning(), []);

    return (
        <div className="share-panel">
            <h5 className="heading">
                {i18n.gettext("Map link")}
            </h5>
            <div className="input-group">
                <Input.TextArea value={mapLink}
                />
            </div>
            <CopyToClipboardButton
                type="secondary"
                getTextToCopy={() => mapLink}
                messageInfo={i18n.gettext("The map link copied to clipboard.")}
            >
                {i18n.gettext("Copy link")}
            </CopyToClipboardButton>

            <div className="divider"></div>

            {socialNetworksEnabled && socialLinks}

            <h5 className="heading">
                {i18n.gettext("Embed code for your site")}
            </h5>

            {settings["check_origin"] && CORSWarning}

            <div className="input-group input-group--inline">
                <span className="input-group__label">
                    {i18n.gettext("Map size:")}
                </span>
                <InputNumber
                    title={i18n.gettext("Width, px")}
                    value={widthMap}
                    onChange={v => setWidthMap(v)}
                />
                <CloseIcon/>
                <InputNumber
                    title={i18n.gettext("Height, px")}
                    value={heightMap}
                    onChange={v => setHeightMap(v)}
                />
                <span className="input-group__label">
                    {i18n.gettext("px")}
                </span>
            </div>
            <div className="input-group">
                <Switch
                    checked={addLinkToMap}
                    onChange={v => setAddLinkToMap(v)}
                />
                <span className="checkbox__label">
                    {i18n.gettext("Link to main map")}
                </span>
            </div>
            <div className="input-group">
                <Switch
                    checked={generateEvents}
                    onChange={v => setGenerateEvents(v)}
                />
                <span className="checkbox__label">
                    {i18n.gettext("Generate events")}
                </span>
            </div>
            <div className="input-group">
                <Input.TextArea value={embedCode}/>
            </div>

            <CopyToClipboardButton
                type="secondary"
                getTextToCopy={() => embedCode}
                messageInfo={i18n.gettext("The embed code copied to clipboard.")}
            >
                {i18n.gettext("Copy code")}
            </CopyToClipboardButton>
            <div className="divider"></div>


            <h5 className="heading">
                {i18n.gettext("Preview")}
            </h5>
            <form action={previewMapUrl}
                  method="POST"
                  target="_blank">
                <input type="hidden"
                       name="iframe"
                       value={encodeURI(embedCode)}/>
                <Button type="primary"
                        htmlType="submit"
                        icon={<PreviewIcon/>}>
                    {i18n.gettext("Preview")}
                </Button>
            </form>
        </div>
    );
};

SharePanel.propTypes = {
    socialNetworksEnabled: PropTypes.bool,
    display: PropTypes.object,
    eventVisibility: PropTypes.string
};
