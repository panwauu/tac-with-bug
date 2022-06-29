import axios from 'axios';
import { user, logout } from '@/services/useUser';
import { socket } from '@/main'

axios.interceptors.response.use(res => res, error => {
    if (error.response.status === 401) {
        logout(socket)
    }
    throw error
});

axios.interceptors.request.use(req => {
    if (req.headers != null) { req.headers.Authorization = `Bearer ${user.token}` }
    return req;
});

export default axios;
