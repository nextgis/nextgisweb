import { PropTypes } from "prop-types";
import { Popover } from "@nextgisweb/gui/antd";
import HelpOutlineIcon from "@material-icons/svg/help_outline";
import { url } from "@nextgisweb/pyramid/nextgis";

import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import i18n from "@nextgisweb/pyramid/i18n";

import "./ExternalAccess.less";

const READ_MORE = i18n.gettext("Read more");

const Help = ({ help, docsUrl }) => (
    <>
        {help}
        {docsUrl && (
            <>
                {" "}
                <a target="_blank" href={url("docs:" + docsUrl)}>
                    {READ_MORE}
                </a>
            </>
        )}
    </>
);

const Link = ({ title, help, docsUrl, url }) => (
    <>
        <div className="row-title">
            {title}{" "}
            <Popover
                overlayClassName="ngw-resource-external-access-popover"
                placement="right"
                content={<Help help={help} docsUrl={docsUrl} />}
            >
                <HelpOutlineIcon />
            </Popover>
        </div>
        <div className="row-input-info">
            <div className="url-text">{url}</div>
            <CopyToClipboardButton
                type="link"
                getTextToCopy={() => url}
                messageInfo={i18n.gettext("The link copied to clipboard.")}
                iconOnly
            />
        </div>
    </>
);

export function ExternalAccess({ links }) {
    return (
        <div className="ngw-resource-external-access">
            {links.map((link, idx) => (
                <Link key={idx} {...link} />
            ))}
        </div>
    );
}

ExternalAccess.propTypes = {
    links: PropTypes.array,
};
