import { action, observable } from "mobx";

import type {
    ResourceCls,
    ResourceWidget,
} from "@nextgisweb/resource/type/api";

export class CompositeStore {
    readonly operation: "create" | "update" | "delete";
    readonly config: Record<string, unknown>;
    readonly id: number | null;
    readonly cls: ResourceCls;
    readonly parent: number | null;
    readonly owner_user: number;
    readonly sdnBase: string | null;
    @observable accessor sdnDynamic: string | null = null;

    constructor({
        cls,
        config,
        id,
        operation,
        owner_user,
        parent,
        suggested_display_name,
    }: ResourceWidget) {
        this.cls = cls;
        this.operation = operation;
        this.config = config;
        this.id = id;

        this.parent = parent;
        this.owner_user = owner_user;
        this.sdnBase = suggested_display_name;
    }

    buildRendering(): void {
        //
    }
    startup(): void {}
    async validateData(): Promise<boolean> {
        return false;
    }
    async serialize(lunkwill: any): Promise<any> {
        return {};
    }
    deserialize(data: any): void {
        //
    }
    async storeRequest(args: any): Promise<any> {
        return {};
    }
    lock(): void {}
    unlock(err?: any): void {}
    createObj(edit: boolean): void {
        //
    }
    onCreateSuccess(data: any, edit: boolean): void {}
    updateObj(): void {
        //
    }
    deleteObj(): void {
        //
    }
    refreshObj(): void {
        //
    }
    @action
    suggestDN(value: string | null) {
        this.sdnDynamic = value;
        return () => {
            if (this.sdnDynamic === value) {
                this.sdnDynamic = null;
            }
        };
    }
}
