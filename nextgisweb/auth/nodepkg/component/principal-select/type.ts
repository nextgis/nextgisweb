import type { GroupReadBrief, UserReadBrief } from "@nextgisweb/auth/type/api";
import type { Select } from "@nextgisweb/gui/antd";

type SelectProps<V> = Parameters<typeof Select<V>>[0];

export interface PrincipalSelectProps<V extends number = number>
    extends SelectProps<V> {
    editOnClick?: boolean;
    systemUsers?: boolean | string[];
    multiple?: boolean;
    model?: "principal" | "user" | "group";
    value?: V;
}

export type Member =
    | (UserReadBrief & { _user: true })
    | (GroupReadBrief & { _user: false });
