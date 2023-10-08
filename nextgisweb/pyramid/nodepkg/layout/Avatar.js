import { observer } from "mobx-react-lite";

import oauth from "@nextgisweb/auth/oauth";
import { authStore } from "@nextgisweb/auth/store";
import { Popover } from "@nextgisweb/gui/antd";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import "./Avatar.less";

const msgSignIn = gettext("Sign in");

export const Avatar = observer(() => {
    const { authenticated, invitationSession, userDisplayName } = authStore;

    const content = (
        <>
            {invitationSession && (
                <div className="warning">{gettext("Invitation session")}</div>
            )}
            <a href={routeURL("auth.settings")}>{gettext("Settings")}</a>
            <a href="#" onClick={() => authStore.logout()}>
                {gettext("Sign out")}
            </a>
        </>
    );

    const showLoginModal = () => {
        if (oauth.enabled && oauth.default) {
            const qs = new URLSearchParams([["next", window.location]]);
            window.open(routeURL("auth.oauth") + "?" + qs.toString(), "_self");
        } else {
            authStore.showModal();
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
                    arrow={{ pointAtCenter: true }}
                >
                    <div className="ngw-pyramid-avatar-label">
                        {userDisplayName
                            .replace(/(.)[^\s]+(?: (.).*)?/, "$1$2")
                            .toUpperCase()}
                    </div>
                </Popover>
            ) : authStore.showLoginModal ? (
                <a onClick={showLoginModal}>{msgSignIn}</a>
            ) : (
                <a href={ngwConfig.logoutUrl}>{msgSignIn}</a>
            )}
        </div>
    );
});
