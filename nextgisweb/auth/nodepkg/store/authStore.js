import { makeAutoObservable } from "mobx";
import { route, routeURL } from "@nextgisweb/pyramid/api";

class AuthStore {
    loginError = "";
    isLogining = false;

    authenticated = !window.ngwConfig.isGuest;
    invitationSession = window.ngwConfig.invitationSession;
    userDisplayName = window.ngwConfig.userDisplayName;
    isAdministrator = window.ngwConfig.isAdministrator;

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
            this.loginError = er.title;
            throw new Error(er);
        } finally {
            this.isLogining = false;
        }
    }

    logout() {
        this._logout();
        window.open(window.ngwConfig.logoutUrl);
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
