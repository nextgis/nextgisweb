import { Popover } from "@nextgisweb/gui/antd";
import { routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!pyramid";
import "./Avatar.less";

const authenticated = !ngwConfig.isGuest;
const invitationSession = ngwConfig.invitationSession;
const userDisplayName = ngwConfig.userDisplayName;

export function Avatar({ }) {
    const content = (
        <>
            {invitationSession && (
                <div className="warning">
                    {i18n.gettext("Invitation session")}
                </div>
            )}
            <a href={routeURL("auth.settings")}>{i18n.gettext("Settings")}</a>
            <a href={ngwConfig.logoutUrl}>{i18n.gettext("Sign out")}</a>
        </>
    );

    return (
        <div
            className={
                "ngw-pyramid-avatar" +
                (authenticated ? " ngw-pyramid-avatar-authenticated" : "") +
                (invitationSession ? " ngw-pyramid-avatar-danger" : "")
            }
        >
            {authenticated ? (
                <Popover
                    placement="bottomRight"
                    trigger="click"
                    title={userDisplayName}
                    content={content}
                    overlayClassName="ngw-pyramid-avatar-popover"
                    arrowPointAtCenter
                >
                    <div className="ngw-pyramid-avatar-label">
                        {userDisplayName
                            .replace(/(.)[^\s]+(?: (.).*)?/, "$1$2")
                            .toUpperCase()}
                    </div>
                </Popover>
            ) : (
                <a href={ngwConfig.loginUrl}>{i18n.gettext("Sign in")}</a>
            )}
        </div>
    );
}
