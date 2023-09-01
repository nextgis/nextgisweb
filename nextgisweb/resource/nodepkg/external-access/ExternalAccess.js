import { Popover, Space } from "@nextgisweb/gui/antd";
import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { url } from "@nextgisweb/pyramid/nextgis";

import HelpOutlineIcon from "@nextgisweb/icon/material/help_outline";

import "./ExternalAccess.less";

const msgReadMore = gettext("Read more");

const Help = ({ help, docsUrl }) => (
    <>
        {help}
        {docsUrl && (
            <>
                {" "}
                <a target="_blank" href={url("docs:" + docsUrl)}>
                    {msgReadMore}
                </a>
            </>
        )}
    </>
);

const Link = ({ title, help, docsUrl, url }) => (
    <Space direction="vertical" style={{ width: "100%" }}>
        <Space>
            {title}
            <Popover
                overlayClassName="ngw-resource-external-access-popover"
                placement="right"
                content={<Help help={help} docsUrl={docsUrl} />}
            >
                <HelpOutlineIcon />
            </Popover>
        </Space>
        <div className="row-input-info">
            <div className="url-text">{url}</div>
            <CopyToClipboardButton
                type="link"
                getTextToCopy={() => url}
                messageInfo={gettext("The link copied to clipboard.")}
                iconOnly
            />
        </div>
    </Space>
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
