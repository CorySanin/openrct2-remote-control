# openrct2-remote-control

Execute server operations by using commands in chat or over a TCP connection.

## Commands

If initiating these over in-game chat, the command must be proceeded by a `!` or a `/`. The player must also have the `kick_player` permission.

- **quit** - Aborts the server process immediately
- **save** \[filename] - Saves the park. An optional filename can be specified.
- **pause** - Pauses/unpauses the game
- **hire** \[staffType] \[quantity] - Hires a staff member. A staff type and the number to hire can be provided. Defaults to `handyman` and `1` respectively.
- **capture** \[param: value ...] - Takes a screenshot and saves it to the screenshot directory. The following otional parameters can be provided: filename, width, height, x, y, zoom, rotation. For a full-park screenshot, only pass in values for zoom and rotation. *Does not work on a headless server.*

## Docker Setup

There are some additional steps for running this configuration in Docker. The plugin configuration needs to have the hostname set to 0.0.0.0 (see `config/openrct2/plugin.store.json` for an example). Then the OpenRCT2 configuration must be set to allow binding to that address (see `config/openrct2/config.ini`).
