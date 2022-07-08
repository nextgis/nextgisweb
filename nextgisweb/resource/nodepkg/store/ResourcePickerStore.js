import { extractError } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { loadParents } from "../util/loadParents";
import { makeAutoObservable, runInAction } from "mobx";

export class ResourcePickerStore {
    childrenLoadError = false;
    childrenLoading = false;
    children = [];

    parentId = 0;
    initialParentId = 0;

    setBrearcrumbItemsError = false;
    brearcrumbItemsLoading = false;
    brearcrumbItems = [];

    createNewGroupLoading = false;
    createNewGroupError = false;

    disabledIds = [];
    enabledCls = [];

    allowSelection = true;
    allowMoveInside = true;

    allowCreateResource = true;

    selected = [];

    onNewGroup = null;

    setChildrenAbortController = null;
    setBrearcrumbItemsAbortController = null;
    createNewGroupAbortController = null;

    constructor({ parentId, disabledIds, enabledCls, onNewGroup }) {
        this.parentId = parentId;
        this.initialParentId = this.parentId;
        this.onNewGroup = onNewGroup;
        if (disabledIds) {
            this.disabledIds = disabledIds;
        }
        if (enabledCls) {
            this.enabledCls = enabledCls;
        }
        makeAutoObservable(this, {
            setChildrenAbortController: false,
            setBrearcrumbItemsAbortController: false,
            createNewGroupAbortController: false,
        });
        this.changeParentTo(this.parentId);
    }

    async changeParentTo(parent) {
        this.cleanSelection();
        runInAction(() => {
            this.parentId = parent;
            this.setChildrenFor(parent);
            this.setBrearcrumbItems(parent);
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

    cleanSelection() {
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
        if (this.setBrearcrumbItemsAbortController) {
            this.setBrearcrumbItemsAbortController.abort();
        }
        this.setBrearcrumbItemsAbortController = null;
    }

    aboretNewGroupCreation() {
        if (this.createNewGroupAbortController) {
            this.createNewGroupAbortController.abort();
        }
        this.createNewGroupAbortController = null;
    }

    async setBrearcrumbItems(parent) {
        this.abortBreadcrumbsLoading();
        try {
            runInAction(() => {
                this.brearcrumbItemsLoading = true;
            });
            this.setBrearcrumbItemsAbortController = new AbortController();
            const parents = await loadParents(parent, {
                signal: this.setBrearcrumbItemsAbortController.signal,
            });
            runInAction(() => {
                this.brearcrumbItems = parents;
            });
        } catch (er) {
            const { title } = extractError(er);
            runInAction(() => {
                this.setBrearcrumbItemsError = title;
            });
            throw new Error(er);
        } finally {
            runInAction(() => {
                this.brearcrumbItemsLoading = false;
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
            const resources = resp.map((x) => {
                const res = x.resource;
                return {
                    id: res.id,
                    displayName: res.display_name,
                    cls: res.cls,
                    parent: { id: res.parent.id },
                };
            });
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
            // const newResource = await route("resource.item", createdItem.id).get();

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
