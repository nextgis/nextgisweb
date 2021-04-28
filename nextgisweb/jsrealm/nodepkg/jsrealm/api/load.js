/* entry: true */
import { request } from './request.js';

export function load(path, require, load) {
    request(path).then(load);
}
