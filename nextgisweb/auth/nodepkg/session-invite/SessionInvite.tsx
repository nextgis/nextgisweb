import { Button } from "@nextgisweb/gui/antd";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

interface SessionInviteProps {
    sid: string;
    expires: string;
    next: string;
}

export function SessionInvite({ sid, expires, next }: SessionInviteProps) {
    return (
        <form action={routeURL("auth.session_invite")} method="POST">
            <input name="sid" type="hidden" required value={sid} />
            <input name="expires" type="hidden" required value={expires} />
            {next && <input name="next" type="hidden" value={next} />}
            <Button type="primary" htmlType="submit">
                {gettext("Sign in")}
            </Button>
        </form>
    );
}
