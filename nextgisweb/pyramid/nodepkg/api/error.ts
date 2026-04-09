import { BaseError } from "@nextgisweb/jsrealm/error";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ErrorContact, ErrorResponse } from "@nextgisweb/pyramid/type/api";

import type { LunkwillData } from "./type";

interface BaseAPIErrorOpts<D extends NonNullable<unknown>> {
  title?: string;
  detail?: string;
  contact?: ErrorContact;
  data?: D;
}

export class BaseAPIError<
  D extends NonNullable<unknown> = never,
> extends BaseError {
  readonly title: string;
  readonly message: string;
  readonly detail: string | undefined;
  readonly contact: ErrorContact;
  readonly data?: D;

  protected defaultTitle = gettext("Unknown API error");
  protected defaultMessage = gettext("Something went wrong.");
  protected defaultDetail: string | undefined = undefined;
  protected defaultContact: ErrorContact = "support";

  constructor(message?: string, options: BaseAPIErrorOpts<D> = {}) {
    super(message);
    this.title = options.title ?? this.defaultTitle;
    this.message = message ?? this.defaultMessage;
    this.detail = options.detail ?? this.defaultDetail;
    this.contact = options.contact ?? this.defaultContact;
    this.data = options.data ?? ({} as D);
  }
}

export class NetworkResponseError extends BaseAPIError {
  protected defaultTitle = gettext("Network error");
  protected defaultMessage = gettext(
    "There is no response from the server or problem connecting to server."
  );
  protected defaultDetail = gettext(
    "Check network connectivity and try again later."
  );
}

export class InvalidResponseError extends BaseAPIError {
  protected defaultTitle = gettext("Unexpected server response");
  protected defaultMessage = gettext("Something went wrong.");
}

export class ServerResponseError extends BaseAPIError<NonNullable<unknown>> {
  readonly status_code: number;
  readonly exception: string;
  readonly request_id?: string;

  constructor(data: ErrorResponse) {
    super(data.message, {
      title: data.title,
      detail: data.detail,
      contact: data.contact,
      data: data.data,
    });
    this.exception = data.exception;
    this.status_code = data.status_code;
    this.request_id = data.request_id;
  }
}

export class LunkwillError extends BaseAPIError<LunkwillData> {
  protected defaultTitle = gettext("Long-running request error");
  protected defaultMessage = gettext(
    "Unexpected error while processing long-running request."
  );

  constructor(message?: string, data: LunkwillData = {}) {
    super(message, { data });
  }
}

export class LunkwillRequestCancelled extends LunkwillError {
  protected defaultMessage = gettext("Long-running request was cancelled.");
}

export class LunkwillRequestTimeout extends LunkwillError {
  protected defaultMessage = gettext("Long-running request timeout.");
}

export class LunkwillRequestFailed extends LunkwillError {}
