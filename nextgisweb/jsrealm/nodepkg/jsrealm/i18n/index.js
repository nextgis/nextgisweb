/* entrypoint: true */
import entrypoint from '../entrypoint';

export * from './load'
export * from './hbs'

// Load translation for jsrealm component
entrypoint('@nextgisweb/jsrealm/i18n!jsrealm');
