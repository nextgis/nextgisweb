import { extractError } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!resource";
import { makeAutoObservable, runInAction } from "mobx";
import { loadParents } from "../../util/loadParents";

const getThisMsg = i18n.gettext("Move to this group");
const getSelectedMsg = i18n.gettext("Move to selected group");

export class ResourcePickerStore {
    childrenLoadError = false;
    childrenLoading = false;
    children = [];

    parentId = 0;
    initialParentId = 0;

    setBreadcrumbItemsError = false;
    breadcrumbItemsLoading = false;
    breadcrumbItems = [];

    createNewGroupLoading = false;
    createNewGroupError = false;

    showCls = [];

    disabledIds = [];
    enabledCls = [];

    allowSelection = true;
    allowMoveInside = true;

    allowCreateResource = true;

    selected = [];

    onNewGroup = null;

    setChildrenAbortController = null;
    setBreadcrumbItemsAbortController = null;
    createNewGroupAbortController = null;

    getThisMsg = getThisMsg;
    getSelectedMsg = getSelectedMsg;

    constructor({
        parentId,
        onNewGroup,
        disabledIds,
        enabledCls,
        showCls,
        getSelectedMsg,
        getThisMsg,
    }) {
        this.parentId = parentId;
        this.initialParentId = this.parentId;
        this.onNewGroup = onNewGroup;

        if (disabledIds) {
            this.disabledIds = disabledIds;
        }
        if (enabledCls) {
            this.enabledCls = enabledCls;
        }
        if (showCls) {
            this.showCls = showCls;
        }
        if (getSelectedMsg) {
            this.getSelectedMsg = getSelectedMsg;
        }
        if (getThisMsg) {
            this.getThisMsg = getThisMsg;
        }
        makeAutoObservable(this, {
            setChildrenAbortController: false,
            setBreadcrumbItemsAbortController: false,
            createNewGroupAbortController: false,
        });
        this.changeParentTo(this.parentId);
    }

    async changeParentTo(parent) {
        this.clearSelection();
        runInAction(() => {
            this.parentId = parent;
            this.setChildrenFor(parent);
            this.setBreadcrumbItems(parent);
        });
    }

    destroy() {
        this.abort();
    }

    refresh() {
        return this.setChildrenFor(this.parentId);
    }

    returnToInitial() {
        this.changeParentTo(this.initialParentId);
    }

    setSelected(selected) {
        runInAction(() => {
            this.selected = selected;
        });
    }

    clearSelection() {
        this.setSelected([]);
    }

    setAllowSelection(status) {
        runInAction(() => {
            this.allowSelection = status;
        });
    }

    setAllowMoveInside(status) {
        runInAction(() => {
            this.allowMoveInside = status;
        });
    }

    setAllowCreateResource(status) {
        this.allowCreateResource = status;
    }

    abort() {
        this.abortChildLoading();
        this.abortBreadcrumbsLoading();
        this.aboretNewGroupCreation();
    }

    abortChildLoading() {
        if (this.setChildrenAbortController) {
            this.setChildrenAbortController.abort();
        }
        this.setChildrenAbortController = null;
    }

    abortBreadcrumbsLoading() {
        if (this.setBreadcrumbItemsAbortController) {
            this.setBreadcrumbItemsAbortController.abort();
        }
        this.setBreadcrumbItemsAbortController = null;
    }

    aboretNewGroupCreation() {
        if (this.createNewGroupAbortController) {
            this.createNewGroupAbortController.abort();
        }
        this.createNewGroupAbortController = null;
    }

    async setBreadcrumbItems(parent) {
        this.abortBreadcrumbsLoading();
        try {
            runInAction(() => {
                this.breadcrumbItemsLoading = true;
            });
            this.setBreadcrumbItemsAbortController = new AbortController();
            const parents = await loadParents(parent, {
                signal: this.setBreadcrumbItemsAbortController.signal,
            });
            runInAction(() => {
                this.breadcrumbItems = parents;
            });
        } catch (er) {
            const { title } = extractError(er);
            runInAction(() => {
                this.setBreadcrumbItemsError = title;
            });
            throw new Error(er);
        } finally {
            runInAction(() => {
                this.breadcrumbItemsLoading = false;
            });
        }
    }

    async setChildrenFor(parent) {
        this.abortChildLoading();
        try {
            this.setChildrenAbortController = new AbortController();
            runInAction(() => {
                this.childrenLoading = true;
            });
            const resp = await route("resource.collection").get({
                query: { parent },
                signal: this.setChildrenAbortController.signal,
            });
            const resources = [];
            for (const x of resp) {
                const res = x.resource;
                const cls = res.cls;
                const s = this.showCls;
                const showClsAllowed =
                    s && s.length ? this.showCls.includes(cls) : true;
                if (showClsAllowed) {
                    resources.push({
                        id: res.id,
                        displayName: res.display_name,
                        cls,
                        parent: { id: res.parent.id },
                    });
                }
            }
            runInAction(() => {
                this.children = resources;
            });
        } catch (er) {
            const { title } = extractError(er);
            runInAction(() => {
                this.childrenLoadError = title;
            });
            throw new Error(er);
        } finally {
            runInAction(() => {
                this.childrenLoading = false;
            });
        }
    }

    async createNewGroup(name) {
        this.aboretNewGroupCreation();
        try {
            this.createNewGroupAbortController = new AbortController();
            runInAction(() => {
                this.createNewGroupLoading = true;
            });

            const payload = {
                resource: {
                    display_name: name,
                    keyname: null,
                    parent: {
                        id: this.parentId,
                    },
                    cls: "resource_group",
                },
            };
            const createdItem = await route("resource.collection").post({
                json: payload,
            });

            await this.refresh();
            const newItem = [...this.children].find(
                (c) => c.id === createdItem.id
            );

            if (newItem) {
                if (this.onNewGroup) {
                    this.onNewGroup(newItem);
                }
                return newItem;
            }
        } catch (er) {
            const { title } = extractError(er);
            runInAction(() => {
                this.createNewGroupError = title;
            });
            throw er;
        } finally {
            runInAction(() => {
                this.createNewGroupLoading = false;
            });
        }
    }
}
