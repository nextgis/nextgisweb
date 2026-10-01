import { action, observableRef } from "mobx";

import { BaseAPIError, route } from "@nextgisweb/pyramid/api";

import type { Credentials } from "../login/type";

class AuthStore {
  @observableRef accessor loginError = "";
  @observableRef accessor isLogining = false;
  @observableRef accessor authenticated = !ngwConfig.isGuest;
  @observableRef accessor invitationSession = ngwConfig.invitationSession;
  @observableRef accessor userDisplayName = ngwConfig.userDisplayName;
  @observableRef accessor isAdministrator = ngwConfig.isAdministrator;
  @observableRef accessor showLoginModal = true;

  @action
  async login(creds: Credentials) {
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
