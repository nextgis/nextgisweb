import { makeAutoObservable } from "mobx";

import type { LoginResponse } from "@nextgisweb/auth/type/api";
import { extractError } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import entrypoint from "@nextgisweb/jsrealm/entrypoint";
import { route } from "@nextgisweb/pyramid/api";

import type { Credentials, LoginFormProps } from "../login/type";

class AuthStore {
    loginError = "";
    isLogining = false;
    authenticated = !ngwConfig.isGuest;
    invitationSession = ngwConfig.invitationSession;
    userDisplayName = ngwConfig.userDisplayName;
    isAdministrator = ngwConfig.isAdministrator;
    showLoginModal = true;

    constructor() {
        makeAutoObservable(this);
    }

    async login(creds: Credentials) {
        this._logout();
        this._cleanErrors();
        try {
            this.isLogining = true;
            const resp = await route("auth.login_cookies").post<LoginResponse>({
                json: creds,
            });
            this.authenticated = true;
            this.userDisplayName = resp.display_name;
            return resp;
        } catch (er) {
            const er_ = er as ApiError;
            const { title } = extractError(er_);
            this.loginError = title;
            throw new Error(er_.title);
        } finally {
            this.isLogining = false;
        }
    }

    logout() {
        this._logout();
        window.open(ngwConfig.logoutUrl, "_self");
    }

    async showModal() {
        const { loginModal } = await import("../login");
        loginModal();
    }

    async runApp(props: LoginFormProps, el: HTMLDivElement) {
        this.showLoginModal = false; // Do not show new modal on "Sign in" click
        const [{ default: reactApp }, { LoginBox }] = await Promise.all([
            entrypoint<{
                default: typeof import("@nextgisweb/gui/react-app").default;
            }>("@nextgisweb/gui/react-app"),
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
