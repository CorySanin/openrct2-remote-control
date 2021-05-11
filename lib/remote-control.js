var NEWLINE = new RegExp('\n', 'g');
var PREFIX = new RegExp('^(!|/)');
var QUIT = new RegExp('^(abort|exit|halt|quit|stop)($| )', 'i');
var SAVE = new RegExp('^save($| )', 'i');
var SAY = new RegExp('^(say|send|broadcast)($| )', 'i');
var PAUSE = new RegExp('^(pause|unpause)($| )', 'i');
var GET = new RegExp('^get($| )', 'i');
var PARKINFO = new RegExp('(park|parkinfo|park-info)($| )', 'i');
var PARKMESSAGES = new RegExp('(messages|parkmessages|park-messages)($| )', 'i');
var CHEAT = new RegExp('(^| )cheat($| )', 'i');
var CAPTURE = new RegExp('^(capture|screenshot)($| )', 'i');
var CAPTUREPARAMS = new RegExp('([a-z]+): ?([^\s,]+)', 'g');
var h = '';
if (typeof context.setTimeout !== 'function') {
    context.setTimeout = function (callback, delay) {
        callback();
        return -1;
    };
}
function doCommand(command) {
    var args;
    if ((args = doesCommandMatch(command, [QUIT])) !== false) {
        console.executeLegacy('abort');
    }
    else if ((args = doesCommandMatch(command, [SAVE])) !== false) {
        console.executeLegacy(("save_park " + args).trim());
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
        var options = {
            zoom: 1,
            rotation: 0
        };
        var position = {};
        var match = void 0;
        while ((match = CAPTUREPARAMS.exec(args)) !== null) {
            var value = null;
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
            options.position = position;
        }
        context.captureImage(options);
    }
    else {
        return false;
    }
    return true;
}
function doNetworkCommand(command) {
    var args;
    if ((args = doesCommandMatch(command, [GET])) !== false && typeof args === 'string' && args.length > 0) {
        var result = context.sharedStorage.get(args, null);
        if (typeof result === 'string') {
            result = {
                result: result
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
                players: network.players.map(function (p) { return ({
                    id: p.id,
                    group: p.group,
                    name: p.name,
                    ping: p.ping,
                    hash: p.publicKeyHash,
                    ip: p.ipAddress
                }); }),
                groups: network.groups.map(function (g) { return ({
                    id: g.id,
                    name: g.name
                }); })
            }
        };
    }
    else if ((args = doesCommandMatch(command, ['update'])) !== false) {
        var sub = args;
        if ((args = doesCommandMatch(sub, ['player'])) !== false) {
            args = args.split(' ', 2);
            var player = getPlayerByHash(args[0]);
            var result = {
                result: player !== null
            };
            if (result.result) {
                args = args[1];
                player.group = parseInt(args);
            }
            return result;
        }
    }
    else if ((args = doesCommandMatch(command, ['kick'])) !== false) {
        var playerind = getPlayerIndexByHash(args);
        var result = {
            result: playerind >= 0
        };
        if (result.result) {
            network.kickPlayer(playerind);
        }
        return result;
    }
    else if ((args = doesCommandMatch(command, [PARKMESSAGES])) !== false) {
        return {
            messages: park.messages.map(function (m) { return ({
                month: m.month,
                day: m.day,
                type: m.type,
                text: m.text,
                subject: (m.subject) ? m.subject : null
            }); })
        };
    }
    return null;
}
function getCommand(str) {
    if (str.match(PREFIX)) {
        return str.replace(PREFIX, '').trim();
    }
    return false;
}
function doesCommandMatch(str, commands) {
    for (var _i = 0, commands_1 = commands; _i < commands_1.length; _i++) {
        var command = commands_1[_i];
        if (typeof command === 'string') {
            if (str.startsWith(command)) {
                var ret = str.substring(command.length, str.length).trim();
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
function getPlayerByHash(hash) {
    var player = null;
    network.players.every(function (p) {
        if (p.publicKeyHash === hash) {
            player = p;
            return false;
        }
        return true;
    });
    return player;
}
function getPlayerIndexByHash(hash) {
    for (var i = 0; i < network.players.length; i++) {
        if (hash === network.players[i].publicKeyHash) {
            return i;
        }
    }
    return -1;
}
function isPlayerAdmin(player) {
    var perms = network.getGroup(player.group).permissions;
    return perms.indexOf('kick_player') >= 0;
}
function getPlayer(playerID) {
    if (playerID === -1) {
        return null;
    }
    var player = null;
    var players = network.players;
    for (var _i = 0, players_1 = players; _i < players_1.length; _i++) {
        var p = players_1[_i];
        if (p.id === playerID) {
            player = p;
        }
    }
    return player;
}
function setCheatAction(type, param1, param2) {
    if (param1 === void 0) { param1 = 1; }
    if (param2 === void 0) { param2 = 0; }
    context.executeAction('setcheataction', {
        type: type,
        param1: param1,
        param2: param2
    }, doNothing);
}
function main() {
    var onlineOnly = context.sharedStorage.get('remote-control.onlineonly', true);
    if (!onlineOnly || network.mode === 'server') {
        context.subscribe('network.chat', function (e) {
            var msg = e.message;
            var command = getCommand(msg);
            if (command !== false && isPlayerAdmin(getPlayer(e.player))) {
                var result_1 = doCommand(command);
                if (typeof result_1 === 'string') {
                    context.setTimeout(function () { return network.sendMessage(result_1, [e.player]); }, 1000);
                }
            }
        });
        var server = network.createListener();
        var port = context.sharedStorage.get('remote-control.port', 35711);
        var host = context.sharedStorage.get('remote-control.host', '127.0.0.1');
        h = host;
        server.on('connection', function (socket) {
            socket.on('data', function (data) {
                var result = doCommand(data);
                if (result !== false) {
                    result = {
                        result: result
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
}
registerPlugin({
    name: 'control',
    version: '1.0.0',
    authors: ['Cory Sanin'],
    type: 'remote',
    licence: 'MIT',
    main: main
});
