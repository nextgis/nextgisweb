import loginModal from "@nextgisweb/auth/loginModal";
import { Popover } from "@nextgisweb/gui/antd";
import { routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!pyramid";
import { observer } from "mobx-react-lite";
import { authStore } from "@nextgisweb/auth/store";
import "./Avatar.less";

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
            <a href={ngwConfig.logoutUrl}>{i18n.gettext("Sign out")}</a>
        </>
    );

    const showLoginModal = () => {
        loginModal();
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
            ) : (
                <a href="#" onClick={showLoginModal}>
                    {i18n.gettext("Sign in")}
                </a>
            )}
        </div>
    );
});
