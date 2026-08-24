import { ArchiveManageWidget } from "@nextgisweb/feature-layer/archive-manage";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";

const msgExportButton = gettext("Export attachments to ZIP archive");
const msgExportHelp = gettext(
  "Use export to copy feature attachments between different layers or to create a backup. The resulting ZIP archive will contain all of the attachments put in directories named after feature IDs. Attachment metadata are put into a separate JSON file."
);
const msgImportButton = gettext("Import attachments from ZIP archive");
const msgImportHelp = gettext(
  "Upload a ZIP archive to batch append attachments to existing features. An archive must contain directories named after feature IDs. Each directory can contain one or many attachments. Duplicates will be ignored."
);
const msgDelete = gettext("Delete existing attachments");
const msgImportedSkipped = gettextf(
  "Attachments imported - {i}, skipped - {s}."
);

export function AttachmentManageWidget({ id }: { id: number }) {
  return (
    <ArchiveManageWidget
      id={id}
      exportRoute="feature_attachment.export"
      exportHelpMsg={msgExportHelp}
      exportButtonMsg={msgExportButton}
      importRoute="feature_attachment.import"
      importHelpMsg={msgImportHelp}
      importButtonMsg={msgImportButton}
      deleteMsg={msgDelete}
      renderImportResult={(result) =>
        msgImportedSkipped({ i: result.imported, s: result.skipped })
      }
    />
  );
}
