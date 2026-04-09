import { BaseAPIError, ServerResponseError } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ErrorContact } from "@nextgisweb/pyramid/type/api";

const msgDefaultMessage = gettext("Something went wrong.");
const msgDefaultTitle = gettext("Error");

export interface ErrorInfo {
  title: string;
  message: string;
  detail: string | undefined;
  contact: ErrorContact;
  status_code?: number;
  exception?: string;
  request_id?: string;
  data?: unknown;
}

export function extractError(error: unknown): ErrorInfo {
  if (error instanceof BaseAPIError) {
    const result: ErrorInfo = {
      title: error.title,
      message: error.message,
      detail: error.detail,
      contact: error.contact,
    };

    if (error instanceof ServerResponseError) {
      result.status_code = error.status_code;
      result.exception = error.exception;
      result.request_id = error.request_id;
    }

    result.data = error.data;
    return result;
  } else if (error instanceof Error) {
    return {
      title: error.name,
      message: error.message,
      detail: undefined,
      contact: "support",
    };
  } else if (error && typeof error === "object") {
    return {
      title:
        "title" in error && typeof error.title === "string"
          ? error.title
          : msgDefaultTitle,
      message:
        "message" in error && typeof error.message === "string"
          ? error.message
          : msgDefaultMessage,
      detail: undefined,
      contact: "support",
    };
  }

  return {
    title: msgDefaultTitle,
    message: msgDefaultMessage,
    detail: undefined,
    contact: "support",
  };
}
