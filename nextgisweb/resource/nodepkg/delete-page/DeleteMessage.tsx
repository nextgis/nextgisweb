import type { ReactNode } from "react";

import { gettextf, ngettext, ngettextf } from "@nextgisweb/pyramid/i18n";
import { Translated } from "@nextgisweb/pyramid/i18n/translated";
import type { ResourceDeleteSummary } from "@nextgisweb/resource/type/api";

export const msgResourcesCount = (count: number) =>
  ngettextf("resource", "resources", count)(count);

const resourcesGenitive = (count: number) =>
  ngettextf("{} resource", "{} resources", count)(count);

const selectedResourcesGenitive = (count: number) =>
  ngettextf("{} selected resource", "{} selected resources", count)(count);

export interface DeleteMessageProps {
  affected: ResourceDeleteSummary;
  unaffected: ResourceDeleteSummary;
  selectedCount: number;
  resourceName?: string;
}

const reason = (count: number) =>
  ngettext(
    "You may not have sufficient permissions, or other resources may reference it.",
    "You may not have sufficient permissions, or other resources may reference them.",
    count
  );

const irreversible = (count: number) =>
  ngettext(
    "This action is irreversible, and the resource will be permanently deleted.",
    "This action is irreversible, and the resources will be permanently deleted.",
    count
  );

const CascadeTotal = ({
  affected,
  visible,
}: {
  affected: number;
  visible: boolean;
}) => (
  <>
    {" "}
    {visible && (
      <>
        <Translated
          msgf={gettextf(
            "Including child resources, a total of {} will be deleted."
          )}
          args={[
            <b key="total">
              {affected} {msgResourcesCount(affected)}
            </b>,
          ]}
        />{" "}
      </>
    )}
  </>
);

export function DeleteMessage({
  affected,
  unaffected,
  selectedCount,
  resourceName,
}: DeleteMessageProps) {
  const nameSuffix: ReactNode = resourceName ? (
    <>
      {" ("}
      <b>{resourceName}</b>
      {")"}
    </>
  ) : (
    ""
  );

  if (affected.count === 0) {
    if (selectedCount === 1) {
      return (
        <span>
          <Translated
            msgf={gettextf("The selected resource{} cannot be deleted.")}
            args={[nameSuffix]}
          />{" "}
          {reason(1)}
        </span>
      );
    }
    return (
      <span>
        <Translated
          msgf={ngettextf(
            "None of the {} selected resource can be deleted.",
            "None of the {} selected resources can be deleted.",
            selectedCount
          )}
          args={[selectedCount]}
        />{" "}
        {reason(selectedCount)}
      </span>
    );
  }

  const topLevelSucceeded = selectedCount - unaffected.count;
  const hasCascade = affected.count > topLevelSucceeded;

  if (selectedCount === 1) {
    return (
      <span>
        <Translated
          msgf={ngettextf(
            "Please confirm the deletion of the selected resource{}.",
            "Please confirm the deletion of the selected resources.",
            selectedCount
          )}
          args={[nameSuffix]}
        />
        <CascadeTotal affected={affected.count} visible={hasCascade} />
        {irreversible(topLevelSucceeded)}
      </span>
    );
  }

  if (unaffected.count === 0) {
    const selectedPhrase = selectedResourcesGenitive(selectedCount);
    return (
      <span>
        <Translated
          msgf={gettextf("Please confirm the deletion of {}.")}
          args={[
            hasCascade ? selectedPhrase : <b key="total">{selectedPhrase}</b>,
          ]}
        />
        <CascadeTotal affected={affected.count} visible={hasCascade} />
        {irreversible(selectedCount)}
      </span>
    );
  }

  const topLevelPhrase = resourcesGenitive(topLevelSucceeded);
  return (
    <span>
      <Translated
        msgf={gettextf(
          "Please confirm the deletion of {a} out of {s} selected."
        )}
        args={{
          a: hasCascade ? topLevelPhrase : <b key="total">{topLevelPhrase}</b>,
          s: selectedCount,
        }}
      />{" "}
      {ngettext(
        "The remaining resource cannot be deleted, you may not have sufficient permissions, or other resources may reference it.",
        "The remaining resources cannot be deleted, you may not have sufficient permissions, or other resources may reference them.",
        unaffected.count
      )}
      <CascadeTotal affected={affected.count} visible={hasCascade} />
      {irreversible(topLevelSucceeded)}
    </span>
  );
}
