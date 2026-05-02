import { EditIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";

export interface AnnotationPopupContentProps {
  descriptionHtml: string;
  editable?: boolean;
  onEdit?: () => void;
}

const editTitle = gettext("Edit annotation");

export function AnnotationPopupContent({
  descriptionHtml,
  editable = false,
  onEdit,
}: AnnotationPopupContentProps) {
  return (
    <div className="annotation-popup-content">
      <div
        className="annotation-description"
        dangerouslySetInnerHTML={{ __html: descriptionHtml }}
      />

      {editable && (
        <div className="annotation-edit-controls">
          <button
            aria-label={editTitle}
            className="annotation-edit"
            onClick={onEdit}
            title={editTitle}
            type="button"
          >
            <EditIcon />
          </button>
        </div>
      )}
    </div>
  );
}
