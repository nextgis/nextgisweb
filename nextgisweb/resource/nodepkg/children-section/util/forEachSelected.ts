import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { showProgressModal } from "@nextgisweb/gui/progress-modal";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ChildrenResource } from "../type";

const msgInProgress = gettext("Operation in progress");

interface ForEachSelectedProps {
    selected: number[];
    title: string;
    executer: (val: { selectedId: number; signal?: AbortSignal }) => void;
    setItems: React.Dispatch<React.SetStateAction<ChildrenResource[]>>;
    onComplate: (successIds: number[], errorIds: number[]) => void;
    setSelected: React.Dispatch<React.SetStateAction<number[]>>;
    setInProgress?: (val: boolean) => void;
}

export async function forEachSelected({
    executer,
    setItems,
    selected,
    onComplate,
    setSelected,
    setInProgress,
    title = msgInProgress,
}: ForEachSelectedProps) {
    if (setInProgress) {
        setInProgress(true);
    }
    const abortControl = new AbortController();
    const signal = abortControl.signal;
    const progressModal = showProgressModal({
        title,
        onCancel: () => {
            abortControl.abort();
            progressModal.close();
        },
    });
    try {
        const sucessIds: number[] = [];
        const errorIds: number[] = [];

        let counter = 0;
        for (const selectedId of selected) {
            try {
                await executer({ selectedId, signal });
                sucessIds.push(selectedId);
                setSelected((old) => {
                    return old.filter((row) => !sucessIds.includes(row));
                });
                setItems((old: ChildrenResource[]) => {
                    return old.filter((row) => !sucessIds.includes(row.id));
                });
            } catch (er) {
                errorIds.push(selectedId);
                await new Promise((resolve) => {
                    errorModal(er as ApiError, {
                        afterClose: () => resolve(undefined),
                    });
                });
            } finally {
                const progressPercent = Math.ceil(
                    (++counter / selected.length) * 100
                );
                progressModal.setPercent(progressPercent);
            }
        }
        progressModal.close();
        onComplate(sucessIds, errorIds);
    } catch (err) {
        errorModal(err as ApiError);
    } finally {
        if (setInProgress) {
            setInProgress(false);
        }
    }
}
