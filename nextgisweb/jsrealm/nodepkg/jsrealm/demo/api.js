/* entry: true */
import { request, route } from '../api/index.js';
import ErrorDialog from 'ngw-pyramid/ErrorDialog/ErrorDialog';

export default async () => {
    let data;
    try {
        data = await request('/api/some');
    } catch (e) {
        new ErrorDialog(e).show();
    }
    return JSON.stringify(data);
}
