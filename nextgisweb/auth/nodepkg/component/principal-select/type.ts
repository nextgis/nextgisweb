import type { Select } from "@nextgisweb/gui/antd";

import type { Group, User } from "../../type";

export type SelectProps<V> = Parameters<typeof Select<V>>[0];

export type Model = "principal" | "user" | "group";

export interface PrincipalSelectProps<V extends number = number>
    extends SelectProps<V> {
    editOnClick?: boolean;
    systemUsers?: boolean | string[];
    multiple?: boolean;
    model?: "principal" | "user" | "group";
    value?: V;
}

interface Ures_ extends User {
    _user: true;
}
interface Group_ extends Group {
    _user: false;
}

export type Member = Ures_ | Group_;
