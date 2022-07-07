import {
    APP_LOGIN,
    APP_LOGOUT,
} from './types';

const defaultState = {
    token: null,
    id: '',
    username: '',
    displayName: '',
    profileImage: '',
};

let previousSession = {};
const previousSessionData = window.localStorage.getItem('auth');
if (previousSessionData) {
    try {
        previousSession = JSON.parse(previousSessionData);
    } catch (err) {
        // discard session
        window.localStorage.removeItem('auth');
    }
}

export default function(state = {...defaultState, ...previousSession}, action) {
    switch (action.type) {
        case APP_LOGIN:
            const newState = {
                ...state,
                ...action.payload,
            };

            window.localStorage.setItem('auth', JSON.stringify(newState));
            return newState;

        case APP_LOGOUT:
            window.localStorage.removeItem('auth');
            return {...defaultState};

        default:
            return state;
    }
}
