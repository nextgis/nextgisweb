import i18n from "@nextgisweb/pyramid/i18n!resource";
import { showProgressModal } from "@nextgisweb/gui/progress-modal";
import { errorModal } from "@nextgisweb/gui/error";

const titleMsg = i18n.gettext("Operation progress");
const errorTitleMsg = i18n.gettext("The errors occurred during execution");

const errorDetailMsg = (errorItems) => {
    return `${i18n.gettext("Failed to execute items:")} ${errorItems.join(
        ", "
    )}`;
};

export async function forEachSelected({
    executer,
    setItems,
    selected,
    onSuccess,
    setSelected,
    setInProgress,
    title = titleMsg,
    errorTitle = errorTitleMsg,
}) {
    setInProgress(true);
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
        const removeSuccessItems = (old) =>
            old.filter((row) => !sucessItems.includes(row.id));
        let counter = 0;
        for (const selectedItem of selected) {
            try {
                await executer({ selectedItem, signal });
                sucessItems.push(selectedItem);
                setSelected(removeSuccessItems);
                setItems(removeSuccessItems);
            } catch {
                errorItems.push(selectedItem);
            } finally {
                const progressPercent = Math.ceil(
                    (++counter / selected.length) * 100
                );
                progressModal.setPercent(progressPercent);
            }
        }
        progressModal.close();
        if (errorItems.length) {
            errorModal({
                title: errorTitle,
                detail: errorDetailMsg(errorItems),
            });
        } else if (onSuccess) {
            onSuccess(sucessItems);
        }
    } catch (err) {
        errorModal(err);
    } finally {
        setInProgress(false);
    }
}
