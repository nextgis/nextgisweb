import { useMemo, useRef } from "react";

import { CopyToClipboardButton } from "@nextgisweb/gui/buttons";
import { SimpleTable } from "@nextgisweb/gui/component";

import { gettext } from "../i18n";
import { PageTitle } from "../layout";

import { SystemInfoUpdate } from "./SystemInfoUpdate";

import "./SystemInfo.less";

const { distribution } = ngwConfig;

interface SystemInfoProps {
    packages: {
        name: string;
        description: string;
        version: string;
        commit: string | null;
    }[];
    platform: [string, string][];
    browser: {
        support: [string, string | null][];
        current: [string, string] | null;
    };
}

export function SystemInfo({ packages, platform, browser }: SystemInfoProps) {
    const ref = useRef<HTMLDivElement>(null);

    const showCommit = useMemo(
        () => packages.some(({ commit }) => commit),
        [packages]
    );

    return (
        <>
            <PageTitle>
                <CopyToClipboardButton
                    iconOnly={true}
                    getTextToCopy={() => ref.current!.innerText}
                />
            </PageTitle>
            <div ref={ref} className="ngw-pyramid-system-info">
                {distribution && (
                    <h2>
                        {[
                            distribution.description,
                            distribution.version,
                            `(${distribution.date})`,
                        ].join(" ")}
                    </h2>
                )}
                <SystemInfoUpdate />
                <SimpleTable>
                    <thead>
                        <tr>
                            <th>{gettext("Package")}</th>
                            <th>{gettext("Version")}</th>
                            {showCommit && <th>&nbsp;</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {packages.map(
                            ({ name, description, version, commit }) => (
                                <tr key={name}>
                                    <td>{description}</td>
                                    <td>{version}</td>
                                    {showCommit && <td>{commit}</td>}
                                </tr>
                            )
                        )}
                    </tbody>
                </SimpleTable>

                <h2>{gettext("Platform")}</h2>
                <SimpleTable>
                    <tbody>
                        {platform.map(([k, v], idx) => (
                            <tr key={idx}>
                                <th>{k}</th>
                                <td>{v}</td>
                            </tr>
                        ))}
                    </tbody>
                </SimpleTable>

                <h2>{gettext("Browser support")}</h2>
                <SimpleTable>
                    <tbody>
                        {browser.support.map(([family, version], idx) => (
                            <tr key={idx}>
                                <th>{family}</th>
                                <td>
                                    {version
                                        ? version + " " + gettext("or higher")
                                        : gettext("Not supported")}
                                </td>
                            </tr>
                        ))}
                        {browser.current && (
                            <tr>
                                <th>{gettext("Your browser")}</th>
                                <td>{browser.current.join(" ")}</td>
                            </tr>
                        )}
                    </tbody>
                </SimpleTable>
            </div>
        </>
    );
}

SystemInfo.targetElementId = "main";
