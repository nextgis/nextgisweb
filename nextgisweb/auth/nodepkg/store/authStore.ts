import { action, observable } from "mobx";

import type { LoginBody } from "@nextgisweb/auth/type/api";
import { BaseAPIError, route } from "@nextgisweb/pyramid/api";

class AuthStore {
    @observable.ref accessor loginError = "";
    @observable.ref accessor isLogining = false;
    @observable.ref accessor authenticated = !ngwConfig.isGuest;
    @observable.ref accessor invitationSession = ngwConfig.invitationSession;
    @observable.ref accessor userDisplayName = ngwConfig.userDisplayName;
    @observable.ref accessor isAdministrator = ngwConfig.isAdministrator;
    @observable.ref accessor showLoginModal = true;

    @action
    async login(creds: LoginBody) {
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
        } catch (err) {
            if (err instanceof BaseAPIError) {
                this.loginError = err.title;
            }
            throw err;
        } finally {
            this.isLogining = false;
        }
    }

    @action
    logout() {
        this._logout();
        window.open(ngwConfig.logoutUrl, "_self");
    }

    async showModal() {
        const { loginModal } = await import("../login");
        loginModal();
    }

    @action
    setShowLoginModal(val: boolean) {
        this.showLoginModal = val;
    }

    @action
    _logout() {
        this.authenticated = false;
        this.userDisplayName = "";
    }

    @action
    _cleanErrors() {
        this.loginError = "";
    }
}

export const authStore = new AuthStore();
