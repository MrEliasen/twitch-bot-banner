import React from 'react';
import {withRouter} from 'react-router-dom';
import {connect} from 'react-redux';
import {Route, Switch} from 'react-router-dom';
import {bindActionCreators} from 'redux';
import config from '../../config';
import {NotificationContainer} from 'react-notifications';

// styles
import 'react-notifications/lib/notifications.css';
import '../../assets/styles.scss';

// actions
import {logout} from './redux/actions';

// Views
import Auth from '../auth';
import Dashboard from '../dashboard';

// UI components
import {
    Container,
    AppBar,
    Toolbar,
    Typography,
    Button,
    Avatar,
    IconButton,
    Menu,
    MenuItem,
} from '@material-ui/core';

class App extends React.Component {
    constructor() {
        super();

        this.state = {
            open: false,
            anchorEl: null,
        }
    }

    login() {
        window.location.href = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${config.client_id}&redirect_uri=${encodeURI(config.redirect_uri)}&scope=${config.scope}`;
    }

    handleMenu = (event) => {
        this.setState({anchorEl: event.currentTarget, open: true});
    }
    
    handleClose = () => {
        this.setState({anchorEl: null, open: false});
    }

    render() {
        const {open, anchorEl} = this.state;
        const {token, logout, displayName, profileImage} = this.props;

        return (
            <React.Fragment>
                <AppBar position="static">
                    <Toolbar>
                        <Typography variant="h6" style={{flexGrow: 1}}>
                            Ban Twitch Bots
                        </Typography>

                        {
                            !token &&
                            <Button color="inherit" onClick={this.login}>
                                <i className="fab fa-twitch"></i>&nbsp;Login with Twitch
                            </Button>
                        }

                        {token && (
                            <div>
                                <IconButton
                                    aria-label="account of current user"
                                    aria-controls="menu-appbar"
                                    aria-haspopup="true"
                                    onClick={this.handleMenu}
                                    color="inherit"
                                >
                                    <Avatar alt={displayName} src={profileImage} />
                                </IconButton>
                                <Menu
                                    id="menu-appbar"
                                    anchorEl={anchorEl}
                                    keepMounted
                                    open={open}
                                    onClose={this.handleClose}
                                >
                                  <MenuItem onClick={logout}>Logout</MenuItem>
                                </Menu>
                            </div>
                        )}
                    </Toolbar>
                </AppBar>
                <NotificationContainer/>
                <Container className="content-wrapper">
                    <Switch location={this.props.location}>
                        <Route exact path="/" component={Dashboard} />
                        <Route path="/auth" component={Auth} />
                    </Switch>
                </Container>
            </React.Fragment>
        );
    }
}

function mapStateToProps(state) {
    return {
        token: state.app.token,
        displayName: state.app.displayName,
        profileImage: state.app.profileImage,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({logout}, dispatch);
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(App));
