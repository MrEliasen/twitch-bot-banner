import React from 'react';
import {withRouter, Redirect} from 'react-router-dom';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {NotificationManager} from 'react-notifications';
import {Typography, LinearProgress} from '@material-ui/core';

// actions
import {login} from '../app/redux/actions';

/* eslint-disable no-restricted-globals */
class Auth extends React.Component {
    componentDidMount() {
        this.parseCallbackUrl();
    }

    parseCallbackUrl = () => {
        const {location, history} = this.props; 
        const hash = location.hash;

        if (!hash || hash.length <= 0) {
            NotificationManager.error('Login failed, invalid response from Twitch.', 'Invalid callback.');
            history.push('/');
            return;
        }

        const pieces = hash.split('&');
        const tokenPiece = pieces.find((piece) => {
            return piece.indexOf('#access_token=') === 0;
        });

        if (!tokenPiece) {
            NotificationManager.error('Login failed, invalid response from Twitch.', 'Invalid callback.');
            history.push('/');
            return;
        }

        const token = tokenPiece.replace('#access_token=', '');
        this.getChannelDetails(token)
    }

    getChannelDetails = (token) => {
        const {login} = this.props;

        fetch('https://api.twitch.tv/helix/users', {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Client-ID': 'r1933h5p34k6doj3ltpe3gxop0kl1t',
                'Authorization': `Bearer ${token}`,
            },
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(response) {
            NotificationManager.success('You can now ban all them bots!', 'Login Success');
            login({
                token,
                id: response.data[0].id,
                username: response.data[0].login,
                displayName: response.data[0].display_name,
                profileImage: response.data[0].profile_image_url,
            });
        })
        .catch(function(err) {
            console.error(err);
            NotificationManager.error('Login failed, invalid response from Twitch.', 'Invalid callback.');
            history.push('/');
        });
    }

    render() {
        const {token} = this.props;

        if (token) {
            return <Redirect to="/" />;
        }

        return (
            <div>
                <Typography>Fetching required account details..</Typography>
                <LinearProgress color="primary" />
            </div>
        );
    }
};
/* eslint-enable no-restricted-globals */

function mapStateToProps(state) {
    return {
        token: state.app.token,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({login}, dispatch);
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Auth));