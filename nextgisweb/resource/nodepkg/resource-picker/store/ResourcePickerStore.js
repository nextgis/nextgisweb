import { extractError } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n";
import { makeAutoObservable, runInAction } from "mobx";
import { loadParents } from "../../util/loadParents";

const getThisMsg = i18n.gettext("Pick this group");

const getSelectedMsg = i18n.gettext("Pick selected");

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
    enabledInterfaces = [];

    allowSelection = true;
    allowMoveInside = true;
    moveInsideCls = ["resource_group"];

    allowCreateResource = true;

    selected = [];

    multiple = false;

    onNewGroup = null;

    setChildrenAbortController = null;
    setBreadcrumbItemsAbortController = null;
    createNewGroupAbortController = null;

    getThisMsg = getThisMsg;
    getSelectedMsg = getSelectedMsg;

    constructor({
        showCls,
        multiple,
        parentId,
        selected,
        enabledCls,
        getThisMsg,
        onNewGroup,
        disabledIds,
        getSelectedMsg,
        enabledInterfaces,
    }) {
        this.parentId = parentId ?? this.parentId;
        this.initialParentId = this.parentId;
        this.onNewGroup = onNewGroup;

        if (selected) {
            this.selected = selected;
        }
        if (disabledIds) {
            this.disabledIds = disabledIds;
        }
        if (multiple) {
            this.multiple = multiple;
        }
        if (enabledCls) {
            this.enabledCls = enabledCls;
        }
        if (enabledInterfaces) {
            this.enabledInterfaces = enabledInterfaces;
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

    checkEnabled(resource) {
        let enabled = true;
        if (this.enabledCls.length) {
            enabled = this.enabledCls.includes(resource.cls);
        }
        if (this.enabledInterfaces && this.enabledInterfaces.length) {
            enabled = resource.interfaces
                ? resource.interfaces.some((intf) =>
                    this.enabledInterfaces.includes(intf)
                )
                : false;
        }
        return enabled;
    }

    refresh() {
        return this.setChildrenFor(this.parentId);
    }

    returnToInitial() {
        this.changeParentTo(this.initialParentId);
    }

    setSelected(selected) {
        runInAction(() => {
            const newSelected = [];
            // Imposible to remove disabled and alredy selected items
            for (const disabledId of this.disabledIds) {
                if (this.selected.includes(disabledId)) {
                    newSelected.push(disabledId);
                }
            }
            for (const s of selected) {
                if (!newSelected.includes(s)) {
                    newSelected.push(s);
                }
            }
            this.selected = newSelected;
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
                    const formatedRes = {
                        id: res.id,
                        cls,
                        displayName: res.display_name,
                        parent: { id: res.parent.id },
                        ...res
                    }
                    delete formatedRes.children;
                    resources.push(formatedRes);
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
