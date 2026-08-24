import { ArchiveManageWidget } from "@nextgisweb/feature-layer/archive-manage";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgExportButton = gettext("Export descriptions to ZIP archive");
const msgExportHelp = gettext(
  "Use export to copy feature descriptions between different layers or to create a backup. The resulting ZIP archive will contain one HTML file per feature, named after the feature ID."
);
const msgImportButton = gettext("Import descriptions from ZIP archive");
const msgImportHelp = gettext(
  "Upload a ZIP archive to batch update feature descriptions. An archive must contain one HTML file per feature, named after the feature ID."
);
const msgDelete = gettext("Delete existing descriptions");

export function DescriptionManageWidget({ id }: { id: number }) {
  return (
    <ArchiveManageWidget
      id={id}
      exportRoute="feature_description.export"
      exportHelpMsg={msgExportHelp}
      exportButtonMsg={msgExportButton}
      importRoute="feature_description.import"
      importHelpMsg={msgImportHelp}
      importButtonMsg={msgImportButton}
      deleteMsg={msgDelete}
    />
  );
}
