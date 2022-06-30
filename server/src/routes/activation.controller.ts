import type express from 'express';

import { Controller, Get, Post, Route, Request, Query, Path, TsoaResponse, Res } from 'tsoa';
import { sendActivation } from '../communicationUtils/email';
import { activateUser } from '../services/activation';
import { getUser } from '../services/user';

@Route('activation')
export class ActivationController extends Controller {
    /**
     * Activates a certain user with token from activation email
     */
    @Get('/')
    public async activateUser(
        @Request() request: express.Request,
        @Query() userID: number,
        @Query() token: string,
        @Res() tokenWrongResponse: TsoaResponse<403, string>,
        @Res() userNotFoundResponse: TsoaResponse<404, string>
    ): Promise<string> {
        const user = await getUser(request.app.locals.sqlClient, { id: userID });
        if (user.isErr()) { return userNotFoundResponse(404, 'Validation failed: userID not found') }

        if (user.value.token !== token) { return tokenWrongResponse(403, 'Validation failed: wrong token') }
        await activateUser(request.app.locals.sqlClient, { id: userID })
        return 'Validation of user successfull'
    }

    /**
     * Request a new activation Email
     * @param username Username to recieve a new activation mail
     */
    @Post('/{username}')
    public async requestNewActivationMail(
        @Request() request: express.Request,
        @Path() username: string,
        @Res() alreadyActivatedError: TsoaResponse<409, string>,
        @Res() usernameNotFoundResponse: TsoaResponse<404, string>
    ): Promise<void> {
        const user = await getUser(request.app.locals.sqlClient, { username: username as string });
        if (user.isErr()) { return usernameNotFoundResponse(404, 'Username not found') }

        if (user.value.activated === true) { return alreadyActivatedError(409, 'User is already activated') }

        sendActivation({ user: user.value, token: user.value.token })
    }
}
