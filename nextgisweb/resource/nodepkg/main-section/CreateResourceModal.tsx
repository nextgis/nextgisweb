import sortBy from "lodash-es/sortBy";
import { useMemo, useState } from "react";

import { Button, Modal } from "@nextgisweb/gui/antd";
import type { ModalProps } from "@nextgisweb/gui/antd";
import { useThemeVariables } from "@nextgisweb/gui/hook";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { BlueprintCategory } from "@nextgisweb/resource/type/api";

import { categories, resources } from "../blueprint";
import { ResourceIcon } from "../icon";

import "./CreateResourceModal.less";

const msgCreateResource = gettext("Create resource");

const ALL_RESOURCES = "";

interface CreateResourceModalProps
    extends Omit<ModalProps, "footer" | "classNames"> {
    resourceId: number;
    creatable: string[];
}

export default function CreateResourceModal({
    resourceId,
    creatable,
    style,
    ...props
}: CreateResourceModalProps) {
    const [curCatIdentity, setCurCatIdentity] = useState(ALL_RESOURCES);

    const [resData, catData] = useMemo(() => {
        const outCat: Record<string, BlueprintCategory> = {
            [ALL_RESOURCES]: {
                identity: ALL_RESOURCES,
                order: -100,
                label: gettext("Everything"),
            },
        };
        const outRes = creatable.map((identity) => {
            const resBp = resources[identity]!;
            outCat[resBp.category] = categories[resBp.category];
            return {
                key: identity,
                label: resBp.label,
                category: resBp.category,
                order: resBp.order,
                url:
                    routeURL("resource.create", resourceId) +
                    `?cls=${identity}`,
                icon: <ResourceIcon identity={identity} />,
            };
        });
        return [
            sortBy(
                outRes,
                (i) => i.order,
                (i) => i.label
            ),
            sortBy(Object.values(outCat), (i) => i.order),
        ];
    }, [creatable, resourceId]);

    const resSelCat = useMemo(() => {
        return resData.filter(
            (i) =>
                curCatIdentity === ALL_RESOURCES ||
                i.category === curCatIdentity
        );
    }, [curCatIdentity, resData]);

    const themeVariables = useThemeVariables({
        "border-radius-lg": "borderRadiusLG",
        "color-primary": "colorPrimary",
        "color-primary-bg": "colorPrimaryBg",
    });

    return (
        <Modal
            classNames={{ content: "ngw-resource-create-resource-modal" }}
            style={{ ...themeVariables, ...(style ? style : {}) }}
            title={msgCreateResource}
            footer={null}
            width={960}
            centered
            {...props}
        >
            <div className="categories">
                {catData.map((i) => (
                    <div
                        key={i.identity}
                        className={
                            i.identity === curCatIdentity
                                ? "selected"
                                : undefined
                        }
                        onClick={() => setCurCatIdentity(i.identity)}
                    >
                        {i.label}
                    </div>
                ))}
            </div>
            <div className="resources">
                <div className="grid">
                    {resSelCat.map((i) => (
                        <Button
                            key={i.key}
                            href={i.url}
                            icon={i.icon}
                            size="large"
                        >
                            {i.label}
                        </Button>
                    ))}
                </div>
            </div>
        </Modal>
    );
}
