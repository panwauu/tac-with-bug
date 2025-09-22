/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Team } from './Team';
export type TournamentParticipation = {
    id: number;
    title: string;
    date: string;
    team: Team;
    placement?: number;
    exitRound: number;
    totalRounds: number;
};

