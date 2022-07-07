class BotList {
    constructor(whiteList, greyList) {
        this.whitelist = whiteList;
        this.greylist = greyList;
        this.channelMinimum = 100;
        //this.daysMinimum = 30;
        //this.lastOnline = Math.floor(Date.now() / 1000) - this.daysMinimum * 24 * 60 * 60;
    }

    async fetchList() {
        let list = await fetch('https://api.twitchinsights.net/v1/bots/online', {
            method: 'get',
            mode: 'cors',
        })
        .then((res) => res.json());

        if (!list) {
            return [];
        }

        return this.filterList(list.bots);
    }

    filterList(bots) {
        var filteredBots = [];

        for (var i = 0; i < bots.length; i++) {
            var bot = bots[i];
            var name = bot[0];

            // check channel count
            if (bot[1] < this.channelMinimum) {
                continue;
            }

            // check last activity
            // if (bot[2] < this.lastOnline) {
            //     continue;
            // }

            // check whitelist
            if (this.whitelist.includes(name)) {
                continue;
            }

            // check greylist
            if (this.greylist.includes(name)) {
                continue;
            }

            filteredBots.push({
                name: name,
                channels: bot[1],
            });
        }

        return filteredBots;
    }
}

export default BotList;