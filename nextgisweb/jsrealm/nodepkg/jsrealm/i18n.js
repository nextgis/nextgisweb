/* entry: true */
import loadentry from './loadentry.js';

export * from './i18n/load.js'
export * from './i18n/hbs.js'

// Load translation for jsrealm component
loadentry('@nextgisweb/jsrealm/i18n!jsrealm');
