import { useState } from "react";
import type { ReactNode } from "react";

import { Popover } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { isAbortError } from "@nextgisweb/gui/error";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { KeyValueTable } from "@nextgisweb/webmap/panel/identify/KeyValueTable";
import type { FieldDataItem } from "@nextgisweb/webmap/panel/identify/fields";

import { loadSearchContext } from "../util/loadSearchContext";

const msgTitle = gettext("Matched fields");
const msgError = gettext("Failed to load matched fields");

export interface SearchResultPopoverProps {
  resourceId: number;
  featureId: number;
  searchContext: number[];
  children: ReactNode;
}

export function SearchResultPopover({
  resourceId,
  featureId,
  searchContext,
  children,
}: SearchResultPopoverProps) {
  const [fields, setFields] = useState<FieldDataItem[] | undefined>();
  const [error, setError] = useState(false);
  const { makeSignal, abort } = useAbortController();

  const onOpenChange = (open: boolean) => {
    if (!open) {
      abort();
      return;
    }
    if (fields !== undefined) {
      return;
    }
    setError(false);

    loadSearchContext(resourceId, featureId, searchContext, makeSignal())
      .then(setFields)
      .catch((err) => {
        if (!isAbortError(err)) {
          setError(true);
        }
      });
  };

  let popoverContent: ReactNode;
  if (error) {
    popoverContent = <div>{msgError}</div>;
  } else {
    popoverContent = (
      <LoadingWrapper
        loading={!fields}
        rows={searchContext.length}
        title={false}
        style={{ width: 300 }}
      >
        {fields && <KeyValueTable data={fields} />}
      </LoadingWrapper>
    );
  }

  return (
    <Popover
      placement="right"
      mouseEnterDelay={0.5}
      styles={{ root: { width: 300 } }}
      onOpenChange={onOpenChange}
      title={msgTitle}
      content={popoverContent}
    >
      {children}
    </Popover>
  );
}

SearchResultPopover.displayName = "SearchResultPopover";
