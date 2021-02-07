var NEWLINE = new RegExp('\n', 'g');
var PREFIX = new RegExp('^(!|/)');
var QUIT = new RegExp('^(abort|exit|halt|quit|stop)($| )', 'i');
var SAVE = new RegExp('^save($| )', 'i');
var PAUSE = new RegExp('^(pause|unpause)($| )', 'i');
var CAPTURE = new RegExp('^(capture|screenshot)($| )', 'i');
var CAPTUREPARAMS = new RegExp('([a-z]+): ?([^\s,]+)', 'g');
var h = 'AHHH';
function doCommand(command) {
    var args;
    if ((args = doesCommandMatch(command, [QUIT])) !== false) {
        console.executeLegacy('abort');
    }
    else if ((args = doesCommandMatch(command, [SAVE])) !== false) {
        console.executeLegacy("save_park " + args);
    }
    else if ((args = doesCommandMatch(command, [PAUSE])) !== false) {
        context.executeAction('pausetoggle', {}, doNothing);
    }
    else if ((args = doesCommandMatch(command, [new RegExp('^test($| )', 'i')])) !== false) {
        console.log('test');
        network.sendMessage(h);
    }
    else if ((args = doesCommandMatch(command, [CAPTURE])) !== false) {
        var options = {
            zoom: 1,
            rotation: 0
        };
        var position = {};
        var match = void 0;
        while ((match = CAPTUREPARAMS.exec(args)) !== null) {
            console.log(match);
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
        console.log(options);
        context.captureImage(options);
    }
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
function main() {
    var onlineOnly = context.sharedStorage.get('control.onlineonly', true);
    if (!onlineOnly || network.mode === 'server') {
        context.subscribe('network.chat', function (e) {
            var msg = e.message;
            var command = getCommand(msg);
            if (command !== false && isPlayerAdmin(getPlayer(e.player))) {
                doCommand(command);
            }
        });
        var server = network.createListener();
        var port = context.sharedStorage.get('control.port', 35711);
        var host = context.sharedStorage.get('control.host', '127.0.0.1');
        h = host;
        server.on('connection', function (socket) {
            network.sendMessage('got client');
            socket.on('data', function (data) {
                doCommand(data);
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
