import { observable } from "mobx";

import type {
    ResourceCls,
    ResourceWidget,
} from "@nextgisweb/resource/type/api";

import type { Composite } from "../type";

export class CompositeStore implements Composite {
    readonly operation: "create" | "update" | "delete";
    readonly config: Record<string, unknown>;
    readonly id: number;
    readonly cls: ResourceCls;
    readonly parent?: number;
    readonly owner_user: number;
    readonly sdnBase: string | null;
    @observable accessor sdnDynamic: unknown | null = null;

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
}
