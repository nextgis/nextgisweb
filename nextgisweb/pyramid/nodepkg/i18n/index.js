/* entrypoint: true */
import entrypoint from '@nextgisweb/jsrealm/entrypoint';

export * from './load'
export * from './hbs'

// Load translation for jsrealm component
entrypoint('@nextgisweb/pyramid/i18n!pyramid');
