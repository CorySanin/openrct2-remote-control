/// <reference path="./remote-control-payloads.d.ts" />
import type * as ProjectTypes from "./remote-control-payloads";

declare global {
  type ParkInfo = ProjectTypes.ParkInfo;
  type RemoteParkMessage = ProjectTypes.RemoteParkMessage;
}
