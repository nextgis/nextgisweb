import sortBy from "lodash-es/sortBy";
import { useMemo } from "react";

import { Button, Modal } from "@nextgisweb/gui/antd";
import type { ModalProps } from "@nextgisweb/gui/antd";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { resources } from "../blueprint";
import { ResourceIcon } from "../icon";

import "./CreateResourceModal.less";

const msgCreateResource = gettext("Create resource");

interface CreateResourceModalProps
    extends Omit<ModalProps, "footer" | "classNames"> {
    resourceId: number;
    creatable: string[];
}

export default function CreateResourceModal({
    resourceId,
    creatable,
    ...props
}: CreateResourceModalProps) {
    const items = useMemo(() => {
        const result = creatable.map((identity) => ({
            key: identity,
            label: resources[identity]!.label,
            url: routeURL("resource.create", resourceId) + `?cls=${identity}`,
            icon: <ResourceIcon identity={identity} />,
        }));
        return sortBy(result, (i) => i.label);
    }, [creatable, resourceId]);

    return (
        <Modal
            classNames={{ content: "ngw-resource-create-resource-modal" }}
            title={msgCreateResource}
            footer={null}
            width={960}
            centered
            {...props}
        >
            {items.map((i) => (
                <Button key={i.key} href={i.url} icon={i.icon} size="large">
                    {i.label}
                </Button>
            ))}
        </Modal>
    );
}
