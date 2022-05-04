import { hofReason } from './typesHof';

export interface playerFrontendStatistic {
    history: ('won' | 'lost' | 'coop' | 'aborted' | 'running')[],
    players: {
        mostFrequent: string;
        bestPartner: string;
        worstEnemy: string;
    },
    table: number[],
    gamesDistribution: gamesDistributionData,
    subscriber: boolean,
    people: { [key: string]: number[] },
    hof: hofReason[],
    userDescription: string,
    registered: string,
}

export interface gamesDistributionData {
    teamWon: number;
    teamAborted: number;
    won4: number;
    lost4: number;
    won6: number;
    lost6: number;
    aborted: number;
    running: number;
}