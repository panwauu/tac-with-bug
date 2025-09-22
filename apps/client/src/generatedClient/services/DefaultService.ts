/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CoopBoardType } from '../models/CoopBoardType';
import type { HofData } from '../models/HofData';
import type { LeaderBoardType } from '../models/LeaderBoardType';
import type { PlatformFunFacts } from '../models/PlatformFunFacts';
import type { PlatformStats } from '../models/PlatformStats';
import type { PlayerFrontendStatistic } from '../models/PlayerFrontendStatistic';
import type { PublicTournament } from '../models/PublicTournament';
import type { Record_KeyOfEmailNotificationSettings_boolean_ } from '../models/Record_KeyOfEmailNotificationSettings_boolean_';
import type { TournamentParticipation } from '../models/TournamentParticipation';
import type { UserCreateRequest } from '../models/UserCreateRequest';
import type { UserIdentifier } from '../models/UserIdentifier';
import type { UserNetworkApiResponse } from '../models/UserNetworkApiResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Create a new user
     * @param requestBody
     * @returns string Created
     * @throws ApiError
     */
    public static signUpUser(
        requestBody: UserCreateRequest,
    ): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/sign-up',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Login a user into the platform
     * @param requestBody
     * @returns any Ok
     * @throws ApiError
     */
    public static loginUser(
        requestBody: {
            password: string;
            username: string;
        },
    ): CancelablePromise<{
        colorScheme: 'light' | 'dark' | 'system';
        blockedByModerationUntil: string | null;
        admin: boolean;
        gameDefaultPositions: Array<number>;
        colorBlindnessFlag: boolean;
        locale: string;
        username: string;
        token: string;
        message: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/login',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Checks if a username is free or not
     * @param username
     * @returns boolean Ok
     * @throws ApiError
     */
    public static isUsernameFree(
        username: string,
    ): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/isUsernameFree',
            query: {
                'username': username,
            },
        });
    }
    /**
     * Checks if a email is free or not
     * @param email
     * @returns boolean Ok
     * @throws ApiError
     */
    public static isEmailFree(
        email: string,
    ): CancelablePromise<boolean> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/isEmailFree',
            query: {
                'email': email,
            },
        });
    }
    /**
     * Change username of user
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static changeUsername(
        requestBody: {
            password: string;
            username: string;
        },
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/changeUsername',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Change email of user
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static changeMail(
        requestBody: {
            password: string;
            email: string;
        },
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/changeMail',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Change password of user
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static changePassword(
        requestBody: {
            password_old: string;
            password: string;
        },
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/changePassword',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Request a password reset for user by username or email. User will recieve a reset token by mail
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static requestPasswordReset(
        requestBody: UserIdentifier,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/requestPasswordReset',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Request a new password for user by username or email
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static applyPasswordReset(
        requestBody: {
            token: string;
            password: string;
        },
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/applyPasswordReset',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Update the user description
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static editUserDescription(
        requestBody: {
            userDescription: string;
        },
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/editUserDescription',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Delete a user completely from the platform
     * @returns void
     * @throws ApiError
     */
    public static deleteUser(): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/deleteUser',
        });
    }
    /**
     * Generate a unique teamname for a tournament
     * @param tournamentId
     * @returns string Ok
     * @throws ApiError
     */
    public static generateTournamentTeamName(
        tournamentId: number,
    ): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/generateTeamName',
            query: {
                'tournamentID': tournamentId,
            },
        });
    }
    /**
     * Create a tournament
     * @param requestBody
     * @returns PublicTournament Ok
     * @throws ApiError
     */
    public static createTournament(
        requestBody: {
            nTeams: number;
            secondsPerGame: number;
            creationDates: Array<string>;
            deadline: string;
            begin: string;
            title: string;
        },
    ): CancelablePromise<PublicTournament> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/createTournament',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Exchange user in tournament
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static exchangeTournamentUser(
        requestBody: {
            tournamentID: number;
            usernameOfReplacement: string;
            usernameToReplace: string;
        },
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/exchangeUser',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Exchange user in tournament
     * @param requestBody
     * @returns PublicTournament Ok
     * @throws ApiError
     */
    public static changeTournamentSignUpSize(
        requestBody: {
            creationDates?: Array<string>;
            tournamentID: number;
            nTeams: number;
        },
    ): CancelablePromise<PublicTournament> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/changeTournamentSignUpSize',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Set preferred locale of user
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static setSettingsLocale(
        requestBody: {
            locale: string;
        },
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/setLocale',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Set preferred locale of user
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static setColorBlindnessFlag(
        requestBody: {
            colorBlindnessFlag: boolean;
        },
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/setColorBlindnessFlag',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get preferred game positions
     * @returns number Ok
     * @throws ApiError
     */
    public static getGameDefaultPositions(): CancelablePromise<Array<number>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/getGameDefaultPositions',
        });
    }
    /**
     * Set preferred game positions
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static setGameDefaultPositions(
        requestBody: {
            gameDefaultPositions: Array<number>;
        },
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/setGameDefaultPositions',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get notification settings
     * @returns Record_KeyOfEmailNotificationSettings_boolean_ Ok
     * @throws ApiError
     */
    public static getEmailNotificationSettings(): CancelablePromise<Record_KeyOfEmailNotificationSettings_boolean_> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/getEmailNotificationSettings',
        });
    }
    /**
     * Set notification setting
     * @param requestBody
     * @returns Record_KeyOfEmailNotificationSettings_boolean_ Ok
     * @throws ApiError
     */
    public static setEmailNotificationSettings(
        requestBody: Record_KeyOfEmailNotificationSettings_boolean_,
    ): CancelablePromise<Record_KeyOfEmailNotificationSettings_boolean_> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/setEmailNotificationSettings',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Set color scheme setting to persist for the user
     * Values:
     * - light
     * - dark
     * - system
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static setColorScheme(
        requestBody: {
            colorScheme: 'dark' | 'light' | 'system';
        },
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/setColorScheme',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get statistics of one player
     * @param username
     * @returns PlayerFrontendStatistic Ok
     * @throws ApiError
     */
    public static getPlayerStats(
        username: string,
    ): CancelablePromise<PlayerFrontendStatistic> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/profile/getPlayerStats',
            query: {
                'username': username,
            },
        });
    }
    /**
     * Get social graph for certain player by username
     * @param username
     * @returns UserNetworkApiResponse Ok
     * @throws ApiError
     */
    public static getProfileUserNetwork(
        username: string,
    ): CancelablePromise<UserNetworkApiResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/profile/userNetwork',
            query: {
                'username': username,
            },
        });
    }
    /**
     * Get tournament participations of certain player by username
     * @param username
     * @returns TournamentParticipation Ok
     * @throws ApiError
     */
    public static getUserTournamentParticipations(
        username: string,
    ): CancelablePromise<Array<TournamentParticipation>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/profile/userTournamentParticipations',
            query: {
                'username': username,
            },
        });
    }
    /**
     * Get platform fun facts
     * @returns PlatformFunFacts Ok
     * @throws ApiError
     */
    public static getPlatformFunFacts(): CancelablePromise<PlatformFunFacts> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/getPlatformFunFacts',
        });
    }
    /**
     * Get basic platform stats
     * @returns PlatformStats Ok
     * @throws ApiError
     */
    public static getPlatformStats(): CancelablePromise<PlatformStats> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/getPlatformStats',
        });
    }
    /**
     * Get the npm package version
     * @returns string Ok
     * @throws ApiError
     */
    public static getServerVersion(): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/getServerVersion',
        });
    }
    /**
     * Get profile picture of player
     * @param username
     * @returns string Ok
     * @throws ApiError
     */
    public static getProfilePicture(
        username?: string,
    ): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/getProfilePicture',
            query: {
                'username': username,
            },
        });
    }
    /**
     * Upload custom Profile Picture
     * @returns void
     * @throws ApiError
     */
    public static uploadProfilePicture(): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/uploadProfilePicture',
        });
    }
    /**
     * Replace Picture by random one
     * @returns void
     * @throws ApiError
     */
    public static deleteProfilePicture(): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/deleteProfilePicture',
        });
    }
    /**
     * Get Leaderboard
     * @param limit
     * @param offset
     * @param startDate
     * @param endDate
     * @returns LeaderBoardType Ok
     * @throws ApiError
     */
    public static getWinnerLeaderboard(
        limit: number,
        offset: number,
        startDate?: number,
        endDate?: number,
    ): CancelablePromise<LeaderBoardType> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/getWinnerLeaderboard',
            query: {
                'limit': limit,
                'offset': offset,
                'startDate': startDate,
                'endDate': endDate,
            },
        });
    }
    /**
     * Get Leaderboard for Team Games
     * @param limit
     * @param offset
     * @param nPlayers
     * @param startDate
     * @param endDate
     * @returns CoopBoardType Ok
     * @throws ApiError
     */
    public static getCoopLeaderboard(
        limit: number,
        offset: number,
        nPlayers: number,
        startDate?: number,
        endDate?: number,
    ): CancelablePromise<CoopBoardType> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/getCoopLeaderboard',
            query: {
                'limit': limit,
                'offset': offset,
                'nPlayers': nPlayers,
                'startDate': startDate,
                'endDate': endDate,
            },
        });
    }
    /**
     * Retrieves the usernames of all HOF-members by category
     * @returns HofData Ok
     * @throws ApiError
     */
    public static getHof(): CancelablePromise<HofData> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/getHofData',
        });
    }
    /**
     * Search for players with similar name
     * @param searchString
     * @param nResults
     * @returns any Ok
     * @throws ApiError
     */
    public static searchPlayers(
        searchString: string,
        nResults: number,
    ): CancelablePromise<Array<{
        id: number;
        username: string;
    }>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/searchPlayers',
            query: {
                'searchString': searchString,
                'nResults': nResults,
            },
        });
    }
    /**
     * Delete or Abort a game
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static abortGame(
        requestBody: {
            gameID: number;
        },
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/abortGame',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Activates a certain user with token from activation email
     * @param userId
     * @param token
     * @returns string Ok
     * @throws ApiError
     */
    public static activateUser(
        userId: number,
        token: string,
    ): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/activation',
            query: {
                'userID': userId,
                'token': token,
            },
        });
    }
    /**
     * Request a new activation Email
     * @param username Username to recieve a new activation mail
     * @returns void
     * @throws ApiError
     */
    public static requestNewActivationMail(
        username: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/activation/{username}',
            path: {
                'username': username,
            },
        });
    }
}
