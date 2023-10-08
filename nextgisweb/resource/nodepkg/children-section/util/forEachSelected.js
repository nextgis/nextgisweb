import { errorModal } from "@nextgisweb/gui/error";
import { showProgressModal } from "@nextgisweb/gui/progress-modal";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgInProgress = gettext("Operation in progress");

export async function forEachSelected({
    executer,
    setItems,
    selected,
    onComplate,
    setSelected,
    setInProgress,
    title = msgInProgress,
}) {
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
        const sucessItems = [];
        const errorItems = [];
        const removeSuccessItems = (old) => {
            return old.filter((row) => !sucessItems.includes(row.id));
        };

        let counter = 0;
        for (const selectedItem of selected) {
            try {
                await executer({ selectedItem, signal });
                sucessItems.push(selectedItem);
                setSelected(removeSuccessItems);
                setItems(removeSuccessItems);
            } catch (er) {
                errorItems.push(selectedItem);
                await new Promise((resolve) => {
                    errorModal(er, { afterClose: resolve });
                });
            } finally {
                const progressPercent = Math.ceil(
                    (++counter / selected.length) * 100
                );
                progressModal.setPercent(progressPercent);
            }
        }
        progressModal.close();
        onComplate(sucessItems, errorItems);
    } catch (err) {
        errorModal(err);
    } finally {
        if (setInProgress) {
            setInProgress(false);
        }
    }
}
