import {
    APP_LOGIN,
    APP_LOGOUT,
} from './types';

export function login(userData) {
    return {
        type: APP_LOGIN,
        payload: userData,
    };
}


export function logout() {
    return {
        type: APP_LOGOUT,
    };
}
