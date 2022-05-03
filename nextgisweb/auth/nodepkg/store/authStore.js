import { makeAutoObservable } from "mobx";
import { routeURL } from "@nextgisweb/pyramid/api";
import settings from "@nextgisweb/pyramid/settings!pyramid";

class AuthStore {
    loginError = "";
    isLogining = false;

    authenticated = !window.ngwConfig.isGuest;
    invitationSession = window.ngwConfig.invitationSession;
    userDisplayName = window.ngwConfig.userDisplayName;

    constructor() {
        makeAutoObservable(this);
    }

    async login(creds) {
        this._cleanErrors();
        const { login, password } = creds;
        try {
            const url = routeURL("auth.login_cookies");
            let formData = new FormData();
            formData.append("login", login);
            formData.append("password", password);
            const resp = await fetch(url, { method: "POST", body: formData });
            if (resp.ok) {
                const user = await resp.json();
                this.authenticated = true;
                this.userDisplayName = user.display_name;
            } else {
                const error = await resp.json();
                this.loginError = error.title;
                throw new Error(error);
            }
        } catch (er) {
            throw new Error();
        } finally {
            this.isLogining = false;
        }
    }

    _cleanErrors() {
        this.loginError = "";
    }
}

export const authStore = new AuthStore();

if (ngwConfig.isAdministrator) {
}

if (settings["help_page_url"]) {
}
