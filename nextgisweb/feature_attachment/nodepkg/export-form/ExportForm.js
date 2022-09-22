import { useState } from "react";
import { Button } from "@nextgisweb/gui/antd";
import { routeURL, request, LunkwillParam } from "@nextgisweb/pyramid/api";
import pyramidSettings from "@nextgisweb/pyramid/settings!pyramid";
import i18n from "@nextgisweb/pyramid/i18n!feature_attachment";


export function ExportForm({ id }) {
    const [loading, setLoading] = useState(false);

    const download = async () => {
        setLoading(true);
        let url = routeURL("feature_attachment.export", id);
        if (pyramidSettings.lunkwill_enabled) {
            const lunkwillParam = new LunkwillParam();
            lunkwillParam.require();
            url = await request(url, {
                lunkwill: lunkwillParam,
                lunkwillReturnUrl: true,
            });
        }
        window.open(url);
        setLoading(false);
    };

    return (
        <div>
            <Button type="primary" loading={loading} onClick={download}>
                {i18n.gettext("Download attachments as ZIP-archive")}
            </Button>
        </div>
    );
}
