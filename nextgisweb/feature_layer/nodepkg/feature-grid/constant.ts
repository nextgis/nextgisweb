export const KEY_FIELD_ID = 0;
export const LAST_CHANGED_FIELD_ID = -1;
export const RESIZE_HANDLE_WIDTH = 6;

export const $FID: unique symbol = Symbol("$FID");
export const $VID: unique symbol = Symbol("$VID");

// Sort expression key used in OrderBy tuple to reference feature id.
// A symbol is used to make sure it never clashes with a field keyname.
export const FID_ORDER_KEY: unique symbol = Symbol("$FID_ORDER");
