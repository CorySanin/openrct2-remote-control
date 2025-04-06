export type RemoteParkMessage = {
    month: number;
    day: number;
    type: string;
    text: string;
    subject: number | null;
};

export type ParkDetails = {
    cash: number;
    companyValue: number;
    guests: number;
    name: string;
    parkSize: number;
    rating: number;
    totalAdmissions: number;
    value: number;
};

export type PlayerDetails = {
    id: number;
    group: number;
    name: string;
    ping: number;
    hash: string;
    ip: string;
}

export type GroupDetails = {
    id: number;
    name: string;
}

export type NetworkDetails = {
    players: PlayerDetails[];
    groups: GroupDetails[];
};

export type ParkInfo = {
    park: ParkDetails;
    network: NetworkDetails;
};
