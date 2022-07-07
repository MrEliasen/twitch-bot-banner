import {combineReducers} from 'redux';
import {routerReducer} from 'react-router-redux';

import AppReducer from './components/app/redux/reducer';

const rootReducer = combineReducers({
    app: AppReducer,
    routing: routerReducer,
});

export default rootReducer;
