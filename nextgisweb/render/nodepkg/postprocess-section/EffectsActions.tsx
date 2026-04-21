import { Button } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import "./EffectsActions.less";

const msgEnableEffects = gettext("Enable effects");
const msgDisableEffects = gettext("Disable effects");
const msgResetDefaults = gettext("Reset to defaults");

interface EffectsActionsProps {
  enabled: boolean;
  canReset?: boolean;
  onToggle: () => void;
  onReset?: () => void;
}

export function EffectsActions({
  enabled,
  canReset = false,
  onToggle,
  onReset,
}: EffectsActionsProps) {
  return (
    <div className="ngw-render-effects-actions">
      <div className="left-slot">
        <Button
          className={enabled ? "toggle-button secondary" : "toggle-button"}
          onClick={onToggle}
        >
          {enabled ? msgDisableEffects : msgEnableEffects}
        </Button>
      </div>
      <div className="right-slot">
        {enabled && canReset && onReset ? (
          <Button onClick={onReset}>{msgResetDefaults}</Button>
        ) : null}
      </div>
    </div>
  );
}
