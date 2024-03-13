import { useEffect, useMemo, useState } from "react";

import type { GroupReadBrief, UserReadBrief } from "@nextgisweb/auth/type/api";
import { Select, Space, Tag } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";

import type { Member, PrincipalSelectProps } from "./type";

import SystemUserIcon from "@nextgisweb/icon/material/attribution";
import GroupIcon from "@nextgisweb/icon/material/groups";
import AdministratorIcon from "@nextgisweb/icon/material/local_police";
import RegularUserIcon from "@nextgisweb/icon/material/person";

type TagProps = Parameters<NonNullable<SelectProps["tagRender"]>>[0];

export function PrincipalSelect({
    editOnClick,
    systemUsers,
    multiple = false,
    onChange,
    model = "principal",
    value,
    ...restSelectProps
}: PrincipalSelectProps) {
    const [members, setMembers] = useState<Member[]>([]);
    const { makeSignal } = useAbortController();

    const memberById = (memberId: number): Member | undefined =>
        members.find((itm) => itm.id === memberId);

    const editUrl = (member?: Member) => {
        if (member) {
            const memberId = member.id;
            if (member._user) {
                return routeURL("auth.user.edit", memberId);
            }
            return routeURL("auth.group.edit", memberId);
        }
    };

    const getIcon = (member?: Member) => {
        if (member && member._user) {
            if (member.is_administrator) {
                return <AdministratorIcon />;
            } else if (member.system) {
                return <SystemUserIcon />;
            }
            return <RegularUserIcon />;
        } else {
            return <GroupIcon />;
        }
    };

    const optionRender = ({
        label,
        value,
    }: {
        label: string;
        value: number;
    }) => {
        return (
            <Space>
                {getIcon(memberById(value))}
                {label}
            </Space>
        );
    };

    const tagRender = (tagProps: TagProps) => {
        const { label, closable, onClose, value } = tagProps;
        const member = memberById(value);
        return (
            <Tag
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                closable={closable}
                onClose={onClose}
                style={{ marginRight: 3 }}
            >
                {editOnClick ? (
                    <a
                        href={editUrl(member)}
                        style={{ textDecoration: "none" }}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {label}
                    </a>
                ) : (
                    <span>{label}</span>
                )}
            </Tag>
        );
    };

    useEffect(() => {
        const loadData = () => {
            const promises: Promise<Member[]>[] = [];
            const loadUsers = model === "principal" || model === "user";
            const loadGroups = model === "principal" || model === "group";
            if (loadUsers) {
                promises.push(
                    route("auth.user.collection")
                        .get<UserReadBrief[]>({
                            query: { brief: true },
                            signal: makeSignal(),
                            cache: true,
                        })
                        .then((data) => {
                            return data
                                .filter((itm) => {
                                    if (itm.system) {
                                        if (Array.isArray(systemUsers)) {
                                            return systemUsers.includes(
                                                itm.keyname
                                            );
                                        }
                                        return !!systemUsers;
                                    }
                                    return true;
                                })
                                .map((data) => ({ ...data, _user: true }));
                        })
                );
            }
            if (loadGroups) {
                promises.push(
                    route("auth.group.collection")
                        .get<GroupReadBrief[]>({
                            query: { brief: true },
                            signal: makeSignal(),
                            cache: true,
                        })
                        .then((data) =>
                            data.map((data) => ({ ...data, _user: false }))
                        )
                );
            }
            return Promise.all(promises).then((members_) =>
                members_.flat().sort((a, b) => {
                    const aSystem = a.system && a._user;
                    const bSystem = b.system && b._user;
                    const aGroup = !a._user;
                    const bGroup = !b._user;

                    if (aSystem && bSystem) {
                        return a.display_name.localeCompare(b.display_name);
                    }

                    if (aSystem && !bSystem) return -1;
                    if (!aSystem && bSystem) return 1;

                    if (aGroup && bGroup) {
                        return a.display_name.localeCompare(b.display_name);
                    }

                    if (aGroup && b._user) return -1;
                    if (a._user && bGroup) return 1;

                    return a.display_name.localeCompare(b.display_name);
                })
            );
        };
        loadData().then((choices_) => {
            setMembers(choices_);
        });
    }, [model, makeSignal, systemUsers]);

    const options = useMemo(() => {
        return members
            ? members.map(({ display_name, id }) => {
                  return {
                      label: display_name,
                      value: id,
                  };
              })
            : [];
    }, [members]);

    return (
        <Select
            showSearch
            value={value}
            onChange={onChange}
            mode={multiple ? "multiple" : undefined}
            optionFilterProp="label"
            loading={!members}
            allowClear
            tagRender={tagRender}
            {...restSelectProps}
        >
            {options.map(({ label, value }) => {
                return (
                    <Select.Option key={value} value={value} label={label}>
                        {typeof optionRender === "function"
                            ? optionRender({ label, value })
                            : label}
                    </Select.Option>
                );
            })}
        </Select>
    );
}
