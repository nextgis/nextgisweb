import { Popover } from "@nextgisweb/gui/antd";
import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { url } from "@nextgisweb/pyramid/nextgis";

import HelpOutlineIcon from "@nextgisweb/icon/material/help_outline";

import "./ExternalAccess.less";

// prettier-ignore
const msgUsage = gettext("Use these links to plug data into external applications.");
const msgReadMore = gettext("Read more");

interface HelpProps {
    help: string;
    docsUrl?: string;
}

const Help = ({ help, docsUrl }: HelpProps) => (
    <>
        {help}
        {docsUrl && (
            <>
                {" "}
                <a
                    target="_blank"
                    href={url("docs:" + docsUrl)}
                    rel="noopener noreferrer"
                >
                    {msgReadMore}
                </a>
            </>
        )}
    </>
);

interface LinkProps {
    title: string;
    help: string;
    docsUrl?: string;
    url: string;
}

const Link = ({ title, help, docsUrl, url }: LinkProps) => (
    <>
        <div className="label">
            {title}{" "}
            <Popover
                overlayClassName="ngw-resource-external-access-popover"
                placement="right"
                content={<Help help={help} docsUrl={docsUrl} />}
            >
                <HelpOutlineIcon />
            </Popover>
        </div>
        <div className="url">
            <div className="url-text">{url}</div>
            <CopyToClipboardButton
                type="link"
                getTextToCopy={() => url}
                iconOnly
            />
        </div>
    </>
);

interface ExternalAccessProps {
    links: LinkProps[];
}

export function ExternalAccess({ links }: ExternalAccessProps) {
    return (
        <div className="ngw-resource-external-access">
            <div className="text">{msgUsage}</div>
            {links.map((link, idx) => (
                <Link key={idx} {...link} />
            ))}
        </div>
    );
}
