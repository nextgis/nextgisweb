import type { Select } from "@nextgisweb/gui/antd";
import type { User, Group } from "../../type";

export type SelectProps = Parameters<typeof Select>[0];
export type Model = "principal" | "user" | "group";

export interface PrincipalSelectProps<V extends number = number>
    extends SelectProps {
    editOnClick: boolean;
    systemUsers: boolean | string[];
    multiple: boolean;
    onChange: (val: V) => void;
    model: "principal" | "user" | "group";
    value: V;
}

interface Ures_ extends User {
    _user: true;
}
interface Group_ extends Group {
    _user: false;
}

export type Member = Ures_ | Group_;
