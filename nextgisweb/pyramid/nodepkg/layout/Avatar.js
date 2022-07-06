import { observer } from "mobx-react-lite";
import loginModal from "@nextgisweb/auth/loginModal";
import { authStore } from "@nextgisweb/auth/store";
import { Popover } from "@nextgisweb/gui/antd";
import { routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!pyramid";
import oauth from "@nextgisweb/auth/oauth";
import "./Avatar.less";

const signInText = i18n.gettext("Sign in");

export const Avatar = observer(({}) => {
    const { authenticated, invitationSession, userDisplayName } = authStore;

    const content = (
        <>
            {invitationSession && (
                <div className="warning">
                    {i18n.gettext("Invitation session")}
                </div>
            )}
            <a href={routeURL("auth.settings")}>{i18n.gettext("Settings")}</a>
            <a href="#" onClick={() => authStore.logout()}>
                {i18n.gettext("Sign out")}
            </a>
        </>
    );

    const showLoginModal = () => {
        if (oauth.enabled && oauth.default) {
            const qs = new URLSearchParams([["next", window.location]]);
            window.open(routeURL("auth.oauth") + "?" + qs.toString(), "_self");
        } else {
            loginModal();
        }
    };

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
            ) : authStore.showLoginModal ? (
                <a onClick={showLoginModal}>{signInText}</a>
            ) : (
                <a href={ngwConfig.logoutUrl}>{signInText}</a>
            )}
        </div>
    );
});
