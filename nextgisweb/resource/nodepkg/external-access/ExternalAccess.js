import {PropTypes} from "prop-types";
import {useState, useEffect} from "react";
import {Radio, Button, Space, Row, Typography, Col, Skeleton, Tooltip} from "@nextgisweb/gui/antd";
import {InfoCircleOutlined, CopyOutlined} from "@ant-design/icons";
import {CopyToClipboard} from 'react-copy-to-clipboard';
import {SaveOutlined} from "@ant-design/icons";
import {route} from "@nextgisweb/pyramid/api";
import ErrorDialog from "ngw-pyramid/ErrorDialog/ErrorDialog";
import i18n from "@nextgisweb/pyramid/i18n!";

import "./ExternalAccess.less";

export function ExternalAccess({htmlDataset}) {
    const {title, tooltipText, url, externalDocUrl, externalDocText} = htmlDataset;
    const externalDocEnabled = htmlDataset.externalDocEnabled === "True";

    let externalDoc;
    if (externalDocEnabled && externalDocUrl && externalDocText) {
        externalDoc = <>
            <br/>
            <a target="_blank"
               href={externalDocUrl}>
                {externalDocText}
            </a>
            <div className="material-icons icon-exitToApp"></div>
        </>;
    }

    const titleTooltip = <>
        {tooltipText}
        {externalDoc}
    </>;

    return (<div className="external-access">
        <div className="row-title">
            <div className="text">{title}</div>
            <Tooltip className="info"
                     title={titleTooltip}
            >
                <InfoCircleOutlined/>
            </Tooltip>
        </div>
        <div className="row-input-info">
            <div className="url-text">
                {url}
            </div>
            <CopyToClipboard text={url}>
                <CopyOutlined className="copy-icon"/>
            </CopyToClipboard>
        </div>
    </div>)
}

ExternalAccess.propTypes = {
    htmlDataset: PropTypes.object,
};
