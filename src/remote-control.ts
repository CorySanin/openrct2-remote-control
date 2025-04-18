/// <reference path="../types/openrct2.d.ts" />
/// <reference path="../types/globals.d.ts" />

const PREFIX = new RegExp('^(!|/)');
const QUIT = new RegExp('^(abort|exit|halt|quit|stop)($| )', 'i');
const SAVE = new RegExp('^save($| )', 'i');
const SAY = new RegExp('^(say|send|broadcast)($| )', 'i');
const PAUSE = new RegExp('^(pause|unpause)($| )', 'i');
const GET = new RegExp('^get($| )', 'i');
const HIRE = new RegExp('^hire($| )', 'i');
const PARKINFO = new RegExp('(park|parkinfo|park-info)($| )', 'i');
const PARKMESSAGES = new RegExp('(messages|parkmessages|park-messages)($| )', 'i');
const CHEAT = new RegExp('(^| )cheat($| )', 'i');
const CAPTURE = new RegExp('^(capture|screenshot)($| )', 'i');
const CAPTUREPARAMS = new RegExp('([a-z]+): ?([^\s,]+)', 'g');
const MECHANIC = new RegExp('^mech(anic)?$', 'i');
const SECURITY = new RegExp('^(security|guard|security[\\s-_.]{0,1}guard)$', 'i');
const ENTERTAINER = new RegExp('^entertain(er)?$', 'i');
// action was renamed in API version 66 by #18826 and again in API version 74 by #19987
const SETCHEAT = (context.apiVersion > 65) ? ((context.apiVersion >= 74) ? 'cheatset' : 'setcheat') : 'setcheataction';

let h = '';

// setTimeout polyfill
if (typeof context.setTimeout !== 'function') {
    context.setTimeout = function (callback, _) {
        callback();
        return -1;
    }
}

function createParkInfo(): ParkInfo {
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
    };
}

function getParkMessages(): RemoteParkMessage[] {
    return park.messages.map(m => ({
        month: m.month,
        day: m.day,
        type: m.type,
        text: m.text,
        subject: (m.subject) ? m.subject : null
    }))
}

function doCommand(command: string): string | boolean {
    let args: boolean | string = false;
    if ((args = doesCommandMatch(command, [QUIT])) !== false) {
        console.executeLegacy('abort');
    }
    else if ((args = doesCommandMatch(command, [SAVE])) !== false) {
        context.executeAction(SETCHEAT,
            {
                type: 35,
                param1: 0,
                param2: 0,
                flags: 0
            });
        context.setTimeout(() => console.executeLegacy(`save_park ${args}`.trim()), 500);
    }
    else if ((args = doesCommandMatch(command, [PAUSE])) !== false) {
        context.executeAction('pausetoggle', {});
    }
    else if ((args = doesCommandMatch(command, [SAY])) !== false && typeof args === 'string' && args.length > 0) {
        network.sendMessage(args);
    }
    else if ((args = doesCommandMatch(command, [HIRE])) !== false) {
        let staffType = 0;
        let quantity = 1;
        let staffOrders = 7;
        if (typeof args === 'string' && args.length > 0) {
            const argComponents = args.split(' ');
            if (argComponents[0].match(MECHANIC)) {
                staffType = 1;
                staffOrders = 3;
            }
            else if (argComponents[0].match(SECURITY)) {
                staffType = 2;
                staffOrders = 0;
            }
            else if (argComponents[0].match(ENTERTAINER)) {
                staffType = 3;
                staffOrders = 0;
            }

            if (argComponents.length > 1) {
                const parsed = parseInt(args[1]);
                if (parsed) {
                    quantity = parsed;
                }
            }
        }

        let staffHireArgs: StaffHireArgs = {
            autoPosition: true,
            staffType,
            costumeIndex: 0,
            staffOrders
        };

        for (let i = 0; i < quantity; i++) {
            context.executeAction("staffhire", staffHireArgs);
        }
    }
    else if ((args = doesCommandMatch(command, [CHEAT])) !== false && typeof args === 'string' && args.length > 0) {
        setCheatAction.apply(this, args.split(' ').map((s: string) => parseInt(s)));
    }
    else if ((args = doesCommandMatch(command, [CAPTURE])) !== false) {
        // this will totally crash in headless mode 🙃

        let options: CaptureOptions = {
            zoom: 1,
            rotation: 0
        };
        let position = {};

        let match: RegExpExecArray;
        while (typeof args === 'string' && (match = CAPTUREPARAMS.exec(args)) !== null) {
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

function doNetworkCommand(command: string): object | null {
    let args: string | boolean = false;
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
        return createParkInfo();
    }
    else if ((args = doesCommandMatch(command, ['update'])) !== false) {
        if (typeof args === 'string' && (args = doesCommandMatch(args, ['player'])) !== false) {
            const argsComponents = typeof args === 'string' ? args.split(' ', 2) : ['', ''];
            let player = getPlayerByHash(argsComponents[0]);
            const result = {
                result: player !== null
            }
            if (result.result) {
                args = argsComponents[1];
                player.group = parseInt(args) || player.group;
            }
            return result;
        }
    }
    else if ((args = doesCommandMatch(command, ['kick'])) !== false) {
        let player = getPlayerByHash(args);
        let result = {
            result: player !== null
        }
        if (result.result) {
            network.kickPlayer(player.id);
        }
        return result;
    }
    else if ((args = doesCommandMatch(command, [PARKMESSAGES])) !== false) {
        return {
            messages: getParkMessages()
        };
    }
    return null;
}

function getCommand(str: string): boolean | string {
    if (str.match(PREFIX)) {
        return str.replace(PREFIX, '').trim();
    }
    return false;
}

function doesCommandMatch(str: string, commands: (string | RegExp)[]): boolean | string {
    for (const command of commands) {
        if (typeof command === 'string') {
            // @ts-ignore
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

function getPlayerByHash(hash: string | true): Player | null {
    let player = null;
    if (hash === true) {
        return player;
    }
    network.players.every(p => {
        if (p.publicKeyHash === hash) {
            player = p;
            return false;
        }
        return true;
    });
    return player;
}

function isPlayerAdmin(player: Player, perm: PermissionType) {
    if (player === null) {
        return false;
    }
    var perms: PermissionType[] = network.getGroup(player.group).permissions;
    return perms.indexOf(perm) >= 0;
}

function getPlayer(playerID: number): Player {
    if (playerID < 0) {
        return null;
    }
    return network.getPlayer(playerID);
}

function setCheatAction(type: number, param1: number = 1, param2: number = 0, flags = 0): void {
    context.executeAction(SETCHEAT, {
        type,
        param1,
        param2,
        flags
    });
}

function main() {
    let onlineOnly = context.sharedStorage.get('remote-control.onlineonly', true);
    if (!onlineOnly || network.mode === 'server') {
        let adminPerm: PermissionType = context.sharedStorage.get('remote-control.adminperm', context.sharedStorage.get('sanin.adminperm', 'modify_groups'));
        context.subscribe('network.chat', (e) => {
            let msg = e.message;
            let command = getCommand(msg);
            if (command !== false && isPlayerAdmin(getPlayer(e.player), adminPerm)) {
                let result = doCommand(command as string);
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

registerPlugin({
    name: 'control',
    version: '1.1.5',
    authors: ['Cory Sanin'],
    type: 'remote',
    minApiVersion: 105,
    targetApiVersion: 105,
    licence: 'MIT',
    main
});
