/// <reference path="../types/openrct2.d.ts" />

const NEWLINE = new RegExp('\n', 'g');
const PREFIX = new RegExp('^(!|/)');
const QUIT = new RegExp('^(abort|exit|halt|quit|stop)($| )', 'i');
const SAVE = new RegExp('^save($| )', 'i');
const SAY = new RegExp('^(say|send|broadcast)($| )', 'i');
const PAUSE = new RegExp('^(pause|unpause)($| )', 'i');
const GET = new RegExp('^get($| )', 'i');
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

function doCommand(command): string | null {
    let args: any;
    if ((args = doesCommandMatch(command, [QUIT])) !== false) {
        console.executeLegacy('abort');
    }
    else if ((args = doesCommandMatch(command, [SAVE])) !== false) {
        console.executeLegacy(`save_park ${args}`);
    }
    else if ((args = doesCommandMatch(command, [PAUSE])) !== false) {
        context.executeAction('pausetoggle', {}, doNothing);
    }
    else if ((args = doesCommandMatch(command, [SAY])) !== false && typeof args === 'string' && args.length > 0) {
        network.sendMessage(args);
    }
    else if ((args = doesCommandMatch(command, [GET])) !== false && typeof args === 'string' && args.length > 0) {
        let result = context.sharedStorage.get(args);
        if (typeof result !== 'string') {
            result = JSON.stringify(result);
        }
        return result as string;
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

function main() {
    let onlineOnly = context.sharedStorage.get('control.onlineonly', true);
    if (!onlineOnly || network.mode === 'server') {
        context.subscribe('network.chat', (e) => {
            let msg = e.message;
            let command = getCommand(msg);
            if (command !== false && isPlayerAdmin(getPlayer(e.player))) {
                let result = doCommand(command);
                if (result !== null) {
                    context.setTimeout(() => network.sendMessage(result, [e.player]), 1000);
                }
            }
        });

        let server = network.createListener();
        let port = context.sharedStorage.get('control.port', 35711);
        let host = context.sharedStorage.get('control.host', '127.0.0.1');

        h = host;

        server.on('connection', (socket) => {
            socket.on('data', (data) => {
                let result = doCommand(data);
                if (result !== null) {
                    socket.write(result);
                }
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
    version: '1.0.0',
    authors: ['Cory Sanin'],
    type: 'remote',
    licence: 'MIT',
    main
});
