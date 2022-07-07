import React from 'react';
import {withRouter} from 'react-router-dom';
import {connect} from 'react-redux';
import {NotificationManager} from 'react-notifications';
import {
    Card,
    CardHeader,
    CardContent,
    Button,
    Checkbox,
    Typography,
    Avatar,
    Tooltip,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    ListItemSecondaryAction,
    LinearProgress,
    Divider,
    FormControlLabel,
} from '@material-ui/core';
import config from '../../config.json';
import BotList from '../../botlist';
import TwitchJs from 'twitch-js';

class Dashboard extends React.Component {
    state = {
        whitelist: [],
        exclude: [],
        banned: [],
        unbanned: [],
        alreadyBanned: [],
        banning: false,
        unbanWhitelist: false,
        botsList: null,
        greyList: null,
    };

    constructor(props) {
        super(props);

        this.fileUpload = React.createRef();
    }

    componentDidMount() {
        this.loadLists();
    }

    async loadLists() {
        const greylist = await this.loadGreyList();
        const whitelist = await this.loadWhiteList();
        const botList = new BotList(whitelist, greylist);

        botList.fetchList()
            .then((list) => {
                this.setState({botsList: list});
            })
            .catch((error) => {
                console.error(error);
                NotificationManager.error('Failed load the latest bot list from Twitch Insights.', 'Twitch Insights Error.');
                this.setState({botsList: []});
            });

        // get the list of banned accounts list
        /*fetch(`https://api.twitch.tv/helix/moderation/banned?broadcaster_id=${id}`, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Client-ID': 'r1933h5p34k6doj3ltpe3gxop0kl1t',
                'Authorization': `Bearer ${token}`,
            },
        })
        .then((response) => {
            return response.json();
        })
        .then((response) => {
            console.log(response);
            //response.sort();
            //this.setState({bannedList: response});
        })
        .catch((err) => {
            console.error(err);
            NotificationManager.error('Failed to fetch the latest white list.', 'Github Error.');
            this.setState({whitelist: []});
        });*/
    }

    async loadGreyList() {
        // get the grey list
        let list = await fetch('https://mreliasen.github.io/twitch-bot-list/greylist.json', {
            method: 'GET',
        })
        .then((response) => {
            return response.json();
        })
        .catch((err) => {
            console.error(err);
            NotificationManager.error('Failed to fetch the latest grey list.', 'Github Error.');
            this.setState({greyList: []});
        });

        if (list && Array.isArray(list)) {
            list.sort();
            this.setState({exclude: list, greyList: list});
        }

        return list;
    }

    async loadWhiteList() {
        // get the white list
        let list = await fetch('https://mreliasen.github.io/twitch-bot-list/whitelist.json', {
            method: 'GET',
        })
        .then((response) => {
            return response.json();
        })
        .catch((err) => {
            console.error(err);
            NotificationManager.error('Failed to fetch the latest whitelist.', 'Github Error.');
            this.setState({whitelist: []});
        });

        if (list && Array.isArray(list)) {
            list.sort();
            this.setState({whitelist: list.map((ch) => ch.toLowerCase())});
        }

        return list;
    }

    toggleExclude = (botName) => (event) => {
        const {exclude} = this.state;
        let newList = [...exclude];

        if (!event.target.checked) {
            newList.push(botName);
        } else {
            newList = newList.filter((bot) => bot !== botName);
        }

        this.setState({exclude: newList});
    }

    toggleUnban = (event) => {
        this.setState({'unbanWhitelist': event.target.checked});
    }

    ban = () => {
        const {exclude, banned, botsList, greyList, whitelist, unbanWhitelist} = this.state;
        const {token, username} = this.props;

        NotificationManager.info('Attempting to login to Twtich..', 'Connecting..');
        this.setState({banning: true});

        let botNames = botsList.map((b) => {
            if (typeof b == 'string') {
                return b;
            }

            return b.name;
        });

        let banlist = [...botNames, ...greyList].filter((botName) => {
            return (!exclude.includes(botName) && !banned.includes(botName));
        }).reverse();

        if (unbanWhitelist) {
            banlist = [...banlist, ...whitelist];
        }

        const messagesPer30 = 80;
        const totalToBan = banlist.length;
        const {chat} = new TwitchJs({token, username});

        // Register our event handlers (defined below)
        chat.connect().then((globalUserState) => {
            chat.on(TwitchJs.Chat.Events.DISCONNECTED, (reason) => {
                const {banned, alreadyBanned} = this.state;

                try {
                    if (this.banHandler) {
                        clearInterval(this.banHandler);
                    }
                } catch (err) {
                    // nothing
                }

                if (totalToBan < banned.length) {
                    NotificationManager.info('Disconnected from Twitch, reconnecting..', 'Disconnected');
                    chat.reconnect();
                    return;
                }

                chat.disconnect();
                NotificationManager.info('Disconnected from Twitch', 'Disconnected');

                if (banned.length) {
                    NotificationManager.success(`${banned.length} accounts successfully banned! ${alreadyBanned.length} of which where already banned.`, 'Done');
                }

                this.setState({banning: false});
            });

            chat.on(TwitchJs.Chat.Events.USER_BANNED, (channel) => {
                this.handleUpdateBanList(channel.username);
            });

            chat.on(TwitchJs.Chat.Events.ALREADY_BANNED, (channel) => {
                this.handleUpdateBanList(channel.message.split(' ')[0], true);
            });

            chat.on(TwitchJs.Chat.Events.UNBAN_SUCCESS, (channel) => {
                this.handleUpdateUnBanList(channel);
            });
            chat.on(TwitchJs.Chat.Events.BAD_UNBAN_NO_BAN, (channel) => {
                this.handleUpdateUnBanList(channel);
            });

            NotificationManager.info('The ban hammer is swinging!', 'Banning Accounts');
            NotificationManager.info('The progress might stop now and again due to Twitch rate-limiting. It will resume automatically.', 'Heads Up!');

            // https://dev.twitch.tv/docs/irc/guide/#command--message-limits
            // only send 100 messages per 30 seconds as per Twitch Guidelines.
            // Just in case, we only send 75 messages over 30 sec.
            this.banHandler = setInterval(() => {
                if (banlist.length <= 0) {
                    // unban whitelist

                    clearInterval(this.banHandler);
                    this.banHandler = null;
                    return;
                }

                const botName = banlist.pop();

                if (whitelist.includes(botName.toLowerCase())) {
                    chat
                        .unban(username, botName)
                        .catch((err) => {
                            console.error(`Unban error (${botName}):`, err);
                        });
                } else {
                    chat
                        .ban(username, botName, 'Banned using Ban Twitch Bots from www.sirmre.com')
                        .catch((err) => {
                            console.error(`Banning error (${botName}):`, err);
                        });
                }
            }, 30000 / messagesPer30);
        });
    }

    handleUpdateBanList = (username, wasAlreadyBanned = false) => {
        const {banned, alreadyBanned} = this.state;
        banned.push(username.toLowerCase());

        if (wasAlreadyBanned) {
            alreadyBanned.push(username.toLowerCase());
        }

        this.setState({banned, alreadyBanned});
    }

    handleUpdateUnBanList = (username) => {
        const {unbanned} = this.state;
        unbanned.push(username.toLowerCase());
        this.setState({unbanned});
    }

    login() {
        window.location.href = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${config.client_id}&redirect_uri=${encodeURI(config.redirect_uri)}&scope=${config.scope}`;
    }

    banningProgress = () => {
        const {exclude, banned, banning, botsList, greyList, whitelist, unbanWhitelist, unbanned} = this.state;

        if (!banning) {
            return null;
        }

        const total = (botsList.length + greyList.length) - exclude.length;
        const completed = (banned.length / total) * 100;

        return <div className="banning-progress">
            <LinearProgress variant="determinate" value={completed} />
            <Typography>
                Banned {banned.length} / {total} accounts..
            </Typography>
            {
                unbanWhitelist && 
                <Typography>
                    Unbanned {unbanned.length} / {whitelist.length} accounts..
                </Typography>
            }
        </div>;
    }

    renderBotsList = () => {
        const {exclude, whitelist, banned, botsList} = this.state;

        if (!botsList) {
            return <LinearProgress  />
        }

        return (
            <List component="nav">
                {
                    botsList.map((bot) => {
                        // failsafe incase any of the whitelisted account
                        // are added to the bot list
                        if (whitelist.includes(bot.name)) {
                            return null;
                        }

                        const isString = typeof bot == 'string';

                        const isBanned = banned.includes(bot.name);
                        const keyname = (isString ? bot : bot.name).toLowerCase();

                        return (
                            <ListItem key={keyname}>
                                <ListItemAvatar>
                                    <Tooltip
                                        title={isBanned ? 'BANNED' : 'Ban status unknown.'}
                                        placement="top"
                                    >
                                        <Avatar className={`bot-status ${isBanned ? '--banned' : ''}`}>
                                            {
                                                !isBanned &&
                                                <i className="fas fa-question"></i>
                                            }
                                            {
                                                isBanned &&
                                                <i className="fas fa-gavel"></i>
                                            }
                                        </Avatar>
                                    </Tooltip>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={keyname}
                                    secondary={
                                        isString
                                        ? null
                                        : `Lurking in ${bot.channels} channls`
                                    }
                                />
                                <ListItemSecondaryAction>
                                    <Checkbox
                                        edge="end"
                                        onChange={this.toggleExclude(keyname)}
                                        checked={!exclude.includes(keyname)}
                                        disabled={isBanned}
                                    />
                                </ListItemSecondaryAction>
                            </ListItem>
                        );
                    })
                }
            </List>
        );
    }

    renderGreyList = () => {
        const {exclude, banned, greyList} = this.state;

        if (!greyList) {
            return <LinearProgress  />
        }

        return (
            <List component="nav">
                {
                    greyList.map((botName) => {
                        const isBanned = banned.includes(botName);

                        return (
                            <ListItem key={botName}>
                                <ListItemAvatar>
                                    <Tooltip
                                        title={isBanned ? 'BANNED' : 'Ban status unknown.'}
                                        placement="top"
                                    >
                                        <Avatar className={`bot-status ${isBanned ? '--banned' : ''}`}>
                                            {
                                                !isBanned &&
                                                <i className="fas fa-question"></i>
                                            }
                                            {
                                                isBanned &&
                                                <i className="fas fa-gavel"></i>
                                            }
                                        </Avatar>
                                    </Tooltip>
                                </ListItemAvatar>
                                <ListItemText primary={botName}/>
                                <ListItemSecondaryAction>
                                    <Checkbox
                                        edge="end"
                                        onChange={this.toggleExclude(botName)}
                                        checked={!exclude.includes(botName)}
                                        disabled={isBanned}
                                    />
                                </ListItemSecondaryAction>
                            </ListItem>
                        );
                    })
                }
            </List>
        );
    }

    renderWhiteList = () => {
        const {whitelist, unbanned} = this.state;

        if (!whitelist) {
            return <LinearProgress  />
        }

        return (
            <List component="nav">
                {
                    whitelist.map((botName) => {
                        const isUnbanned = unbanned.includes(botName);

                        return (
                            <ListItem key={botName}>
                                <ListItemAvatar>
                                    <Tooltip
                                        title={isUnbanned ? 'Unbanned' : 'Unban status unknown.'}
                                        placement="top"
                                    >
                                        <Avatar className={`bot-status ${isUnbanned ? '--success' : ''}`}>
                                            {
                                                !isUnbanned &&
                                                <i className="fas fa-question"></i>
                                            }
                                            {
                                                isUnbanned &&
                                                <i className="fas fa-check"></i>
                                            }
                                        </Avatar>
                                    </Tooltip>
                                </ListItemAvatar>
                                <ListItemText primary={botName}/>
                            </ListItem>
                        );
                    })
                }
            </List>
        );
    }

    upload = () => {
        this.fileUpload.current.click();
    }

    onFileChange = async (e) => {
        e.persist();
        NotificationManager.info('Reading file..', 'File Upload');
        let reader = new FileReader();

        reader.onload = (e) => { 
            const file = e.target.result; 
            const lines = file.split(/\r\n|\n/);
            this.setState({botsList: lines});
            NotificationManager.success('User list loaded.', 'File Upload');
        }; 
      
        reader.onerror = (e) => {
            NotificationManager.error(e.target.error.name, 'File Upload');
        };
      
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 350);
        });

        reader.readAsText(e.target.files[0]);
    }

    render() {
        const {token} = this.props;
        const {exclude, botsList, greyList, whitelist, unbanWhitelist} = this.state;
        const botsTotal = botsList ? botsList.length : 0;
        const greysTotal = greyList ? greyList.length : 0;
        const whitelistTotal = whitelist ? whitelist.length : 0;

        return (
            <React.Fragment>
                <Card>
                    <CardHeader
                        title="Ban Twitch Bots/Accounts*"
                    />
                    <CardContent style={{paddingTop: 0}}>
                        {this.banningProgress()}
                        <Typography style={{marginBottom: 10}}>
                            <strong>Important note:</strong> Please do not take this information at face value. There will be false positives in the list. If someone shows up on the list does not mean they are "bad".<br/>
                            This app was made prior to the new ban system and gifting system was in place for Twitch, so I actually do not recommend using it as is. <strong>Instead I suggest uploading your own list instead.</strong>
                        </Typography>
                        <Typography style={{marginBottom: 10}}>
                            *Some of the names on this list are not "bots" in the traditional sense. They are indeed humans who just programatically lurk in many channels at the same time for whatever their reason might be (like farming channel points or collecting stats or whatever). Anyone who does this and <a target="_blank" href="https://github.com/MrEliasen/twitch-bot-list" rel="noopener noreferrer">have asked to be removed</a>, may be added to the greylist (opt-in).<br/>
                            <br/>
                            The list of accounts is directly from <a target="_blank" href="https://twitchinsights.net/bots" rel="noopener noreferrer">Twitch Insights</a> (not affiliated), but with <a target="_blank" href="https://github.com/MrEliasen/twitch-bot-list" rel="noopener noreferrer">whitelisted accounts</a> removed.
                        </Typography>

                        <Divider variant="middle" />

                        <Typography style={{marginBottom: 15, marginTop: 10}}>
                            Get started by selecting the accounts, and any grey listed accounts you want, and hit the button to ban them!
                        </Typography>
                        <div className="ban-button">
                            {
                                token ? (
                                    exclude.length ? 
                                    <Button variant="contained" color="secondary" onClick={this.ban}>Ban Selected</Button>
                                    :
                                    <Button variant="contained" color="secondary" onClick={this.ban}>Ban ALL</Button>
                                ) :
                                    <Button variant="contained" color="primary" onClick={this.login}>Login to continue</Button>
                            }
                        </div>
                    </CardContent>
                </Card>

                <div className="c-lists">
                    <Card className="c-list">
                        <CardHeader
                            title="Bot List"
                            subheader={
                                <React.Fragment>
                                    <p>
                                        <strong>{botsTotal}</strong> currently active bots/accounts found (lurking in 100+ channels);
                                    </p>

                                    {
                                        token &&
                                        <React.Fragment>
                                            <p>
                                                You can also upload your own list of accounts to ban. The file must be a simple text file, where each name on the list is separated by a line break (<a href="/example.txt" download="example.txt" target="_blank">see example file</a>).
                                            </p>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={this.upload}
                                            >
                                                Upload Own List
                                            </Button>
                                        </React.Fragment>
                                    }
                                </React.Fragment>
                            }
                            style={{paddingBottom: 0}}
                        />
                        <CardContent>
                            {this.renderBotsList()}
                        </CardContent>
                    </Card>
                    <Card className="c-list">
                        <CardHeader
                            title="Grey List"
                            subheader={<p>
                                <strong>{greysTotal}</strong> bots/accounts. These are probably fine to allow.<br/>
                                <a target="_blank" href="https://github.com/MrEliasen/twitch-bot-list" rel="noopener noreferrer">Click here</a> for more info.
                            </p>}
                            style={{paddingBottom: 0}}
                        />
                        <CardContent>
                            {this.renderGreyList()}
                        </CardContent>
                    </Card>
                    <Card className="c-list">
                        <CardHeader
                            title="Whitelist"
                            subheader={<div>
                                <p>
                                    <strong>{whitelistTotal}</strong> bots/accounts have been <a target="_blank" href="https://github.com/MrEliasen/twitch-bot-list" rel="noopener noreferrer">whitelisted</a> and will be unbanned as part of the "ban" process if you check the box below:
                                </p>
                                <FormControlLabel
                                    control={<Checkbox
                                        onChange={this.toggleUnban}
                                        checked={unbanWhitelist}
                                    />}
                                    label="Unban whitelisted accounts"
                                />
                                
                            </div>}
                            style={{paddingBottom: 0}}
                        />
                        <CardContent>
                            {this.renderWhiteList()}
                        </CardContent>
                    </Card>
                </div>
                <input
                    ref={this.fileUpload}
                    onChange={this.onFileChange}
                    type="file"
                    style={{'display': 'none'}}
                />
            </React.Fragment>
        );
    }
};

function mapStateToProps(state) {
    return {
        token: state.app.token,
        username: state.app.username,
        id: state.app.id,
    };
}

export default withRouter(connect(mapStateToProps)(Dashboard));
