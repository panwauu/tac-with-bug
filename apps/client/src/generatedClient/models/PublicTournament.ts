/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RegisterTeam } from './RegisterTeam';
import type { Team } from './Team';
import type { TournamentDataKO } from './TournamentDataKO';
export type PublicTournament = {
    id: number;
    title: string;
    tournamentType: 'KO';
    nTeams: number;
    playersPerTeam: 2 | 3;
    teamsPerMatch: 2 | 3;
    teams: Array<Team>;
    registerTeams: Array<RegisterTeam>;
    data: TournamentDataKO;
    status: 'signUpWaiting' | 'signUp' | 'signUpFailed' | 'signUpEnded' | 'ended' | 'running';
    signupBegin: string;
    signupDeadline: string;
    creationDates: Array<string>;
    creationPhase: number;
    timePerGame: string;
};

