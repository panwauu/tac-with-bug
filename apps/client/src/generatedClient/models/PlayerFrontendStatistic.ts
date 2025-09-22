/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GamesDistributionData } from './GamesDistributionData';
import type { HofReason } from './HofReason';
export type PlayerFrontendStatistic = {
    history: Array<'won' | 'lost' | 'coop' | 'aborted' | 'running'>;
    players: {
        worstEnemy: string;
        bestPartner: string;
        mostFrequent: string;
    };
    table: Array<number>;
    gamesDistribution: GamesDistributionData;
    subscriber: boolean;
    people: Record<string, Array<number>>;
    hof: Array<HofReason>;
    userDescription: string;
    registered: string;
    blockedByModerationUntil: string | null;
};

