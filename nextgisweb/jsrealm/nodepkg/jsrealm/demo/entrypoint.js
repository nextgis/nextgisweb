/* entrypoint: true */
import range from 'lodash-es/range';
import entrypoint from '../entrypoint';

export default async () => {
    const array = await entrypoint('dojo/_base/array');
    array.forEach(range(1, 4), function (i) { console.log(`Iteration = ${i}`) });

    const modMixed = await entrypoint('@nextgisweb/jsrealm/demo/aux/mixed');
    return `${modMixed.default()}, ${modMixed.foo()}, ${modMixed.bar()}`;
}
