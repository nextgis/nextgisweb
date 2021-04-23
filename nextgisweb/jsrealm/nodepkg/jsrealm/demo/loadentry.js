/* entry: true */

import range from 'lodash-es/range.js';
import loadentry from '../loadentry.js';

export default async () => {
    const array = await loadentry('dojo/_base/array');
    array.forEach(range(1, 4), function (i) { console.log(`Iteration = ${i}`) });

    const modMixed = await loadentry('@nextgisweb/jsrealm/demo/aux/mod-mixed');
    return `${modMixed.default()}, ${modMixed.foo()}, ${modMixed.bar()}`;
}
