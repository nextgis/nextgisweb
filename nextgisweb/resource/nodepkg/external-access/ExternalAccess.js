import {useRef, forwardRef, createRef} from "react";
import {PropTypes} from "prop-types";
import {Popover} from "@nextgisweb/gui/antd";
import {InfoCircleOutlined, CopyOutlined} from "@ant-design/icons";
import HelpOutlineIcon from "@material-icons/svg/help_outline";
import ContentCopyIcon from "@material-icons/svg/content_copy";
import {CopyToClipboard} from 'react-copy-to-clipboard';

import "./ExternalAccess.less";

export function ExternalAccess({htmlDataset}) {
    const {title, tooltipText, url, externalDocUrl, externalDocText} = htmlDataset;
    const externalDocEnabled = htmlDataset.externalDocEnabled === "True";

    let externalDoc;
    if (externalDocEnabled && externalDocUrl && externalDocText) {
        externalDoc = <>
            {" "}
            <a target="_blank"
               href={externalDocUrl}>
                {externalDocText}
            </a>
        </>;
    }

    const titleTooltip = <>
        {tooltipText}
        {externalDoc}
    </>;

    return (<div className="ngw-resource-external-access">
        <div className="row-title">
            <div className="text">{title}</div>
            {" "}
            <Popover
                overlayClassName="ngw-resource-external-access-popover"
                placement="right"
                content={titleTooltip}
            >
                <HelpOutlineIcon/>
            </Popover>
        </div>
        <div className="row-input-info">
            <div className="url-text">
                {url}
            </div>
            <CopyToClipboard text={url}>
                <span className="copy-icon"><ContentCopyIcon/></span>
            </CopyToClipboard>
        </div>
    </div>)
}

ExternalAccess.propTypes = {
    htmlDataset: PropTypes.object,
};
