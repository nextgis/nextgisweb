import type {
    AnnotationFeature,
    AnnotationInfo,
} from "@nextgisweb/webmap/layer/annotations/AnnotationFeature";

import { showAnnotationEditor } from "./showAnnotationEditor";

interface DialogEditResult {
    action: "undo" | "delete";
    annFeature: AnnotationFeature;
}
interface DialogSaveResult {
    action: "save";
    annFeature: AnnotationFeature;
    newData: AnnotationInfo;
}

export type DialogResult = DialogEditResult | DialogSaveResult;

export class AnnotationsDialog {
    private annotationModal: ReturnType<typeof showAnnotationEditor> | null =
        null;

    public showForEdit(annFeature: AnnotationFeature): Promise<DialogResult> {
        return new Promise((resolve) => {
            this.annotationModal = showAnnotationEditor({
                annFeature,
                onSave: (data) => {
                    resolve({ action: "save", annFeature, newData: data });
                },
                onDelete: () => {
                    resolve({ action: "delete", annFeature });
                },
                onCreate: (newData) => {
                    resolve({ action: "save", annFeature, newData });
                },
                onCancel: () => {
                    resolve({ action: "undo", annFeature });
                },
            });
        });
    }

    public showLastData(): void {
        this.annotationModal?.update({ open: true });
    }
}
