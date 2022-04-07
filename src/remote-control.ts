/// <reference path="../types/openrct2.d.ts" />

const NEWLINE = new RegExp('\n', 'g');
const PREFIX = new RegExp('^(!|/)');
const QUIT = new RegExp('^(abort|exit|halt|quit|stop)($| )', 'i');
const SAVE = new RegExp('^save($| )', 'i');
const SAY = new RegExp('^(say|send|broadcast)($| )', 'i');
const PAUSE = new RegExp('^(pause|unpause)($| )', 'i');
const GET = new RegExp('^get($| )', 'i');
const PARKINFO = new RegExp('(park|parkinfo|park-info)($| )', 'i');
const PARKMESSAGES = new RegExp('(messages|parkmessages|park-messages)($| )', 'i');
const CHEAT = new RegExp('(^| )cheat($| )', 'i');
const CAPTURE = new RegExp('^(capture|screenshot)($| )', 'i');
const CAPTUREPARAMS = new RegExp('([a-z]+): ?([^\s,]+)', 'g');

let h = '';

// setTimeout polyfill
if (typeof context.setTimeout !== 'function') {
    context.setTimeout = function (callback, delay) {
        callback();
        return -1;
    }
}

function doCommand(command): string | boolean {
    let args: any;
    if ((args = doesCommandMatch(command, [QUIT])) !== false) {
        console.executeLegacy('abort');
    }
    else if ((args = doesCommandMatch(command, [SAVE])) !== false) {
        context.executeAction('setcheataction',
            {
                type: 35,
                param1: 0,
                param2: 0,
                flags: 0
            });
        context.setTimeout(() => console.executeLegacy(`save_park ${args}`.trim()), 500);
    }
    else if ((args = doesCommandMatch(command, [PAUSE])) !== false) {
        context.executeAction('pausetoggle', {}, doNothing);
    }
    else if ((args = doesCommandMatch(command, [SAY])) !== false && typeof args === 'string' && args.length > 0) {
        network.sendMessage(args);
    }
    else if ((args = doesCommandMatch(command, [CHEAT])) !== false && typeof args === 'string' && args.length > 0) {
        setCheatAction.apply(this, args.split(' '));
    }
    else if ((args = doesCommandMatch(command, [CAPTURE])) !== false) {
        // this will totally crash in headless mode 🙃

        let options: CaptureOptions = {
            zoom: 1,
            rotation: 0
        };
        let position = {};

        let match;
        while ((match = CAPTUREPARAMS.exec(args)) !== null) {
            let value = null;
            if (match[1] === 'filename') {
                value = match[2];
            }
            else if (match[1] === 'x' || match[1] === 'y') {
                position[match[1]] = parseInt(match[2]);
            }
            else {
                value = parseInt(match[2]);
            }

            if (value !== null) {
                options[match[1]] = value;
            }
        }
        CAPTUREPARAMS.lastIndex = 0;

        if ('x' in position && 'y' in position) {
            options.position = position as CoordsXY;
        }

        context.captureImage(options);
    }
    else {
        return false;
    }
    return true;
}

function doNetworkCommand(command): object | null {
    let args: any;
    if ((args = doesCommandMatch(command, [GET])) !== false && typeof args === 'string' && args.length > 0) {
        let result = context.sharedStorage.get(args, null);
        if (typeof result === 'string') {
            result = {
                result
            };
        }
        return result;
    }
    else if ((args = doesCommandMatch(command, [PARKINFO])) !== false) {
        return {
            park: {
                cash: park.cash,
                companyValue: park.companyValue,
                guests: park.guests,
                name: park.name,
                parkSize: park.parkSize,
                rating: park.rating,
                totalAdmissions: park.totalAdmissions,
                value: park.value
            },
            network: {
                players: network.players.map(p => ({
                    id: p.id,
                    group: p.group,
                    name: p.name,
                    ping: p.ping,
                    hash: p.publicKeyHash,
                    ip: p.ipAddress
                })),
                groups: network.groups.map(g => ({
                    id: g.id,
                    name: g.name
                }))
            }
        }
    }
    else if ((args = doesCommandMatch(command, ['update'])) !== false) {
        let sub = args
        if ((args = doesCommandMatch(sub, ['player'])) !== false) {
            args = args.split(' ', 2);
            let player = getPlayerByHash(args[0]);
            let result = {
                result: player !== null
            }
            if (result.result) {
                args = args[1];
                player.group = parseInt(args);
            }
            return result;
        }
    }
    else if ((args = doesCommandMatch(command, ['kick'])) !== false) {
        let playerind = getPlayerIndexByHash(args);
        let result = {
            result: playerind >= 0
        }
        if (result.result) {
            network.kickPlayer(playerind);
        }
        return result;
    }
    else if ((args = doesCommandMatch(command, [PARKMESSAGES])) !== false) {
        return {
            messages: park.messages.map(m => ({
                month: m.month,
                day: m.day,
                type: m.type,
                text: m.text,
                subject: (m.subject) ? m.subject : null
            }))
        }
    }
    return null;
}

function getCommand(str): boolean | string {
    if (str.match(PREFIX)) {
        return str.replace(PREFIX, '').trim();
    }
    return false;
}

function doesCommandMatch(str, commands): boolean | string {
    for (const command of commands) {
        if (typeof command === 'string') {
            if (str.startsWith(command)) {
                let ret = str.substring(command.length, str.length).trim();
                return (ret) ? ret : true;
            }
        }
        else {
            if (str.match(command)) {
                return str.replace(command, '').trim();
            }
        }
    }
    return false;
}

function getPlayerByHash(hash: string): Player {
    let player = null;
    network.players.every(p => {
        if (p.publicKeyHash === hash) {
            player = p;
            return false;
        }
        return true;
    });
    return player;
}

function getPlayerIndexByHash(hash: string): number {
    for (let i = 0; i < network.players.length; i++) {
        if (hash === network.players[i].publicKeyHash) {
            return i;
        }
    }
    return -1;
}

function isPlayerAdmin(player: Player) {
    var perms: string[] = network.getGroup(player.group).permissions;
    return perms.indexOf('kick_player') >= 0;
}

function getPlayer(playerID: number): Player {
    if (playerID === -1) {
        return null;
    }
    var player: Player = null; //network.getPlayer(playerID);
    var players = network.players;
    for (const p of players) {
        if (p.id === playerID) {
            player = p;
        }
    }
    return player;
}

function setCheatAction(type: number, param1: number = 1, param2: number = 0): void {
    context.executeAction('setcheataction', {
        type,
        param1,
        param2
    }, doNothing);
}

function main() {
    let onlineOnly = context.sharedStorage.get('remote-control.onlineonly', true);
    if (!onlineOnly || network.mode === 'server') {
        context.subscribe('network.chat', (e) => {
            let msg = e.message;
            let command = getCommand(msg);
            if (command !== false && isPlayerAdmin(getPlayer(e.player))) {
                let result = doCommand(command);
                if (typeof result === 'string') {
                    context.setTimeout(() => network.sendMessage(result as string, [e.player]), 1000);
                }
            }
        });

        let server = network.createListener();
        let port = context.sharedStorage.get('remote-control.port', 35711);
        let host = context.sharedStorage.get('remote-control.host', '127.0.0.1');

        h = host;

        server.on('connection', (socket) => {
            socket.on('data', (data) => {
                let result: string | object | boolean = doCommand(data);
                if (result !== false) {
                    result = {
                        result
                    };
                }
                else {
                    result = doNetworkCommand(data);
                }
                socket.write(JSON.stringify(result));
            });
        });

        server.listen(port, host);
    }
}

function doNothing() {
    //Done!
}

registerPlugin({
    name: 'control',
    version: '1.0.1',
    authors: ['Cory Sanin'],
    type: 'remote',
    licence: 'MIT',
    main
});
