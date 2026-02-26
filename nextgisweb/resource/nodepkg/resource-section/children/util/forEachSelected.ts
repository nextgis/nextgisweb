import { errorModal } from "@nextgisweb/gui/error";
import { showProgressModal } from "@nextgisweb/gui/progress-modal";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { DefaultResourceAttrItem } from "../../type";

const msgInProgress = gettext("Operation in progress");

interface ForEachSelectedProps {
    selected: number[];
    title: string;
    executer: (val: { selectedId: number; signal?: AbortSignal }) => void;
    onComplate: (successIds: number[], errorIds: number[]) => void;
    setSelected: React.Dispatch<React.SetStateAction<number[]>>;
    setAttrItems: React.Dispatch<
        React.SetStateAction<DefaultResourceAttrItem[]>
    >;
    setInProgress?: (val: boolean) => void;
}

export async function forEachSelected({
    executer,
    selected,
    onComplate,
    setSelected,
    setAttrItems,
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
                setAttrItems((old) => {
                    return old.filter((row) => !sucessIds.includes(row.id));
                });
            } catch (err) {
                errorIds.push(selectedId);
                await new Promise((resolve) => {
                    errorModal(err, {
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
        errorModal(err);
    } finally {
        if (setInProgress) {
            setInProgress(false);
        }
    }
}
