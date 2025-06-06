import { gettext } from "@nextgisweb/pyramid/i18n";

interface PreviewEmbeddedProps {
    iframe?: string;
}

// prettier-ignore
const messages = [
    gettext("This page is for a preview of the web map to be embedded on the site."),
    gettext('Most likely, you went from the "Share" section of the web map and refreshed the page.'),
    gettext('To generate a preview, go back to the web map page and click "Preview".'),
]

export function PreviewEmbedded({ iframe }: PreviewEmbeddedProps) {
    return (
        <div style={{ overflow: "auto" }}>
            {iframe ? (
                <div dangerouslySetInnerHTML={{ __html: iframe }} />
            ) : (
                <div>
                    {messages.map((msg, index) => (
                        <p key={index}>{msg}</p>
                    ))}
                </div>
            )}
        </div>
    );
}
