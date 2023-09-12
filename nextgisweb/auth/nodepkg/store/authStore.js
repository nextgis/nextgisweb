import { makeAutoObservable } from "mobx";

import { extractError } from "@nextgisweb/gui/error";
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import { route } from "@nextgisweb/pyramid/api";

class AuthStore {
    loginError = "";
    isLogining = false;

    authenticated = !window.ngwConfig.isGuest;
    invitationSession = window.ngwConfig.invitationSession;
    userDisplayName = window.ngwConfig.userDisplayName;
    isAdministrator = window.ngwConfig.isAdministrator;
    showLoginModal = true;

    constructor() {
        makeAutoObservable(this);
    }

    async login(creds) {
        this._logout();
        this._cleanErrors();
        try {
            this.isLogining = true;
            const resp = await route("auth.login_cookies").post({
                json: creds,
            });
            this.authenticated = true;
            this.userDisplayName = resp.display_name;
            return resp;
        } catch (er) {
            const { title } = extractError(er);
            this.loginError = title;
            throw new Error(er);
        } finally {
            this.isLogining = false;
        }
    }

    logout() {
        this._logout();
        window.open(window.ngwConfig.logoutUrl, "_self");
    }

    async showModal() {
        const { loginModal } = await import("../login");
        loginModal();
    }

    async runApp(props, el) {
        this.showLoginModal = false; // Do not show new modal on "Sign in" click
        const [{ default: reactApp }, { LoginBox }] = await Promise.all([
            entrypoint("@nextgisweb/gui/react-app"),
            import("../login"),
        ]);
        reactApp(LoginBox, props, el);
    }

    _logout() {
        this.authenticated = false;
        this.userDisplayName = "";
    }

    _cleanErrors() {
        this.loginError = "";
    }
}

export const authStore = new AuthStore();
