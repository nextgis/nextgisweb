import { useEffect, useState } from "react";

import { Button, Dropdown, Modal, Space } from "@nextgisweb/gui/antd";
import { TextEditor } from "@nextgisweb/gui/component/text-editor";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    AnnotationFeature,
    AnnotationInfo,
} from "@nextgisweb/webmap/layer/annotations/AnnotationFeature";

import { AnnotationAccessType } from "./AnnotationAccessType";
import { AnnotationsSettings } from "./AnnotationsSettings";
import type { AnnotationSettings } from "./AnnotationsSettings";

const DEFAULTS = {
    centered: true,
    width: "400px",
    transitionName: "",
    maskTransitionName: "",
};

export interface AnnotationsModalProps {
    open?: boolean;
    annFeature?: AnnotationFeature | null;
    onSave?: (data: AnnotationInfo) => void;
    onDelete?: () => void;
    onCancel?: () => void;
    onCreate?: (data: AnnotationInfo) => void;
}

export function AnnotationsModal({
    open: open_,
    annFeature,
    onSave,
    onDelete,
    onCancel,
    onCreate,
}: AnnotationsModalProps) {
    const [open, setOpen] = useState(open_ ?? true);
    const [editorValue, setEditorValue] = useState("");
    const [settings, setSettings] = useState<AnnotationSettings>({
        circleSize: 5,
        widthStroke: 1,
        colorStroke: "#d27a00",
        fillStroke: "#FF9800",
    });

    useEffect(() => {
        if (typeof open_ === "boolean") {
            setOpen(open_);
        }
    }, [open_]);

    useEffect(() => {
        if (annFeature) {
            const info = annFeature.getAnnotationInfo();
            const circle =
                info?.style && "circle" in info.style
                    ? info.style.circle
                    : null;
            if (!info || !circle) {
                return;
            }

            setEditorValue(info.description || "");
            setSettings({
                circleSize: circle.radius,
                widthStroke: circle.stroke.width,
                colorStroke: circle.stroke.color,
                fillStroke: circle.fill.color,
            });
        }
    }, [annFeature]);

    const handleClose = () => {
        setOpen(false);
        onCancel?.();
    };

    const updateFeatureFromDialog = (): AnnotationInfo => {
        return {
            style: {
                circle: {
                    radius: settings.circleSize,
                    stroke: {
                        color: settings.colorStroke,
                        width: settings.widthStroke,
                    },
                    fill: {
                        color: settings.fillStroke,
                    },
                },
            },
            description: editorValue,
        };
    };

    const handleDelete = () => {
        onDelete?.();
        setOpen(false);
    };

    const handleSave = () => {
        onSave?.(updateFeatureFromDialog());
        setOpen(false);
    };

    const handleCreate = (isPublic: boolean) => {
        onCreate?.({ ...updateFeatureFromDialog(), public: isPublic });
        setOpen(false);
    };

    const createItems = [
        {
            key: "public",
            label: gettext("Create as public"),
            onClick: () => {
                handleCreate(true);
            },
        },
        {
            key: "private",
            label: gettext("Create as private"),
            onClick: () => {
                handleCreate(false);
            },
        },
    ];

    const title = annFeature?.getId()
        ? gettext("Edit annotation")
        : gettext("Create annotation");

    const accessType = annFeature?.getAccessType();
    const accessTitle = annFeature?.getAccessTypeTitle();
    const geometryType = annFeature?.getGeometryType();

    return (
        <Modal
            {...DEFAULTS}
            title={title}
            open={open}
            destroyOnClose
            onCancel={handleClose}
            footer={
                <div>
                    {annFeature?.getId() ? (
                        <Space>
                            <Button
                                onClick={handleDelete}
                                style={{ float: "left" }}
                                danger
                            >
                                {gettext("Delete")}
                            </Button>
                            <Button onClick={handleClose}>
                                {gettext("Cancel")}
                            </Button>
                            <Button type="primary" onClick={handleSave}>
                                {gettext("Save")}
                            </Button>
                        </Space>
                    ) : (
                        <Space>
                            <Button onClick={handleClose}>
                                {gettext("Cancel")}
                            </Button>
                            <Dropdown menu={{ items: createItems }}>
                                <Button type="primary">
                                    {gettext("Create")}
                                </Button>
                            </Dropdown>
                        </Space>
                    )}
                </div>
            }
        >
            <div
                style={{
                    height: "100%",
                }}
            >
                {accessTitle && (
                    <div style={{ marginBottom: "16px" }}>
                        <AnnotationAccessType accessType={accessType}>
                            {accessTitle}
                        </AnnotationAccessType>
                    </div>
                )}

                <div style={{ marginBottom: "16px", height: "200px" }}>
                    <TextEditor
                        value={editorValue}
                        onChange={setEditorValue}
                        parentHeight
                    />
                </div>

                <div>
                    <AnnotationsSettings
                        value={settings}
                        geometryType={geometryType}
                        onChange={setSettings}
                    />
                </div>
            </div>
        </Modal>
    );
}
