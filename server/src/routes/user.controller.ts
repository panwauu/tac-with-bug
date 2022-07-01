import type express from 'express';

import { Controller, Get, Post, Delete, Body, Route, Request, Security, Query, TsoaResponse, Res, SuccessResponse } from 'tsoa';

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';

import { sendActivation, sendNewPassword } from '../communicationUtils/email'
import { validateUsername, validateEmail, validatePassword, validateLocale, UsernameValidationErrors, EmailValidationErrors, PasswordValidationErrors, LocaleValidationErrors, comparePasswords } from '../helpers/validationHelpers'
import { selectRandomProfilePicture } from '../services/picture'
import { getUser, isUsernameFree, isEmailFree, changePassword, changeMail, updateUsersLastLogin, signUpUser, deleteUser, changeUsername, editUserDescription } from '../services/user';
import { signJWT } from '../helpers/jwtWrapper';
import logger from '../helpers/logger';
import { analyseUserAgentHeader } from '../helpers/userAnalysis';

interface userCreateRequest {
    username: string,
    email: string,
    locale: string,
    password: string
}

@Route('/')
export class UserController extends Controller {
    /**
     * Create a new user
     */
    @SuccessResponse('201', 'Created')
    @Post('/sign-up')
    public async signUpUser(
        @Request() request: express.Request,
        @Body() userToCreate: userCreateRequest,
        @Res() validationError: TsoaResponse<409, UsernameValidationErrors | EmailValidationErrors | PasswordValidationErrors | LocaleValidationErrors>
    ): Promise<string> {
        const usernameResult = await validateUsername(request.app.locals.sqlClient, userToCreate.username)
        if (usernameResult.isErr()) { return validationError(409, usernameResult.error) }

        const emailValidate = await validateEmail(request.app.locals.sqlClient, userToCreate.email)
        if (emailValidate.isErr()) { return validationError(409, emailValidate.error) }

        const passwordResult = validatePassword(userToCreate.password)
        if (passwordResult.isErr()) { return validationError(409, passwordResult.error) }

        const localeResult = validateLocale(userToCreate.locale)
        if (localeResult.isErr()) { return validationError(409, localeResult.error) }

        const hash = await bcrypt.hash(userToCreate.password, 10);
        const user = await signUpUser(request.app.locals.sqlClient, userToCreate.username, userToCreate.email, hash, userToCreate.locale)
        await selectRandomProfilePicture(request.app.locals.sqlClient, user.id)
        sendActivation({ user, token: user.token })

        this.setStatus(201)
        return 'Registered!'
    }

    /**
     * Login a user into the platform
     */
    @Post('/login')
    public async loginUser(
        @Request() request: express.Request,
        @Body() userToLogin: { username: string, password: string },
        @Res() authorizationError: TsoaResponse<401, { message: string, error: string }>
    ): Promise<{ message: string, token: string, username: string, locale: string, colorBlindnessFlag: boolean, gameDefaultPositions: number[] }> {
        const user = await getUser(request.app.locals.sqlClient, { username: userToLogin.username })
        if (user.isErr()) { return authorizationError(401, { message: 'Username is incorrect!', error: 'user' }) }

        if (!user.value.activated) { return authorizationError(401, { message: 'Email not activated', error: 'email' }) }

        const passwordCompare = await comparePasswords(userToLogin.password, user.value.password)
        if (passwordCompare.isErr()) { return authorizationError(401, { message: 'Password is incorrect!', error: 'password' }) }

        analyseUserAgentHeader(request.app.locals.sqlClient, request.headers['user-agent'])

        await updateUsersLastLogin(request.app.locals.sqlClient, userToLogin.username)

        const token = signJWT(userToLogin.username, user.value.id)
        return { message: 'Logged in!', token, username: user.value.username, locale: user.value.locale, colorBlindnessFlag: user.value.colorBlindnessFlag, gameDefaultPositions: user.value.gameDefaultPositions }
    }

    /**
     * Checks if a username is free or not
     */
    @Get('/isUsernameFree')
    public async isUsernameFree(
        @Request() request: express.Request,
        @Query() username: string
    ): Promise<boolean> {
        return isUsernameFree(request.app.locals.sqlClient, username)
    }

    /**
     * Checks if a email is free or not
     */
    @Get('/isEmailFree')
    public async isEmailFree(
        @Request() request: express.Request,
        @Query() email: string
    ): Promise<boolean> {
        return isEmailFree(request.app.locals.sqlClient, email)
    }

    /**
     * Change username of user
     */
    @Security('jwt')
    @Post('/changeUsername')
    public async changeUsername(
        @Request() request: express.Request,
        @Body() requestBody: { username: string, password: string },
        @Res() authorizationError: TsoaResponse<401, { message: string }>,
        @Res() validationError: TsoaResponse<409, UsernameValidationErrors>
    ): Promise<void> {
        const usernameResult = await validateUsername(request.app.locals.sqlClient, requestBody.username)
        if (usernameResult.isErr()) { return validationError(409, usernameResult.error) }

        const user = await getUser(request.app.locals.sqlClient, { id: request.userData.userID })
        if (user.isErr()) { return authorizationError(401, { message: 'Username not found!' }) }

        const passwordCompare = await comparePasswords(requestBody.password, user.value.password)
        if (passwordCompare.isErr()) { return authorizationError(401, { message: 'Password is incorrect!' }) }

        await changeUsername(request.app.locals.sqlClient, request.userData.userID, requestBody.username)
    }

    /**
     * Change email of user
     */
    @Security('jwt')
    @Post('/changeMail')
    public async changeMail(
        @Request() request: express.Request,
        @Body() requestBody: { email: string, password: string },
        @Res() authorizationError: TsoaResponse<401, { message: string }>,
        @Res() validationError: TsoaResponse<409, EmailValidationErrors>
    ): Promise<void> {
        const emailValidate = await validateEmail(request.app.locals.sqlClient, requestBody.email)
        if (emailValidate.isErr()) { return validationError(409, emailValidate.error) }

        const user = await getUser(request.app.locals.sqlClient, { id: request.userData.userID })
        if (user.isErr()) { return authorizationError(401, { message: 'Username not found!' }) }

        const passwordCompare = await comparePasswords(requestBody.password, user.value.password)
        if (passwordCompare.isErr()) { return authorizationError(401, { message: 'Password is incorrect!' }) }

        const token = await changeMail(request.app.locals.sqlClient, request.userData.userID, requestBody.email)
        sendActivation({ user: user.value, token })
    }

    /**
     * Change password of user
     */
    @Security('jwt')
    @Post('/changePassword')
    public async changePassword(
        @Request() request: express.Request,
        @Body() requestBody: { password: string, password_old: string },
        @Res() authorizationError: TsoaResponse<401, { message: string }>,
        @Res() validationError: TsoaResponse<409, any>
    ): Promise<void> {
        const passwordResult = validatePassword(requestBody.password)
        if (passwordResult.isErr()) { return validationError(409, passwordResult.error) }

        const user = await getUser(request.app.locals.sqlClient, { id: request.userData.userID })
        if (user.isErr()) { return authorizationError(401, { message: 'User not found!' }) }

        const passwordCompare = await comparePasswords(requestBody.password_old, user.value.password)
        if (passwordCompare.isErr()) { return authorizationError(401, { message: 'Password is incorrect!' }) }

        const hash = await bcrypt.hash(requestBody.password, 10)
        await changePassword(request.app.locals.sqlClient, request.userData.userID, hash)
    }

    /**
     * Request a new password for user by username or email
     */
    @Post('/requestNewPassword')
    public async requestNewPassword(
        @Request() request: express.Request,
        @Body() userIdentifier: { username: string, email?: string } | { username?: string, email: string },
        @Res() identificationError: TsoaResponse<400, string>
    ): Promise<void> {
        const user = await getUser(request.app.locals.sqlClient, userIdentifier)
        if (user.isErr()) { return identificationError(400, 'User not found') }

        const password = uuidv4().toString().substring(0, 15)
        await sendNewPassword({ user: user.value, password })
        const hash = await bcrypt.hash(password, 10)
        await changePassword(request.app.locals.sqlClient, user.value.id, hash)
    }

    /**
    * Update the user description
    */
    @Security('jwt')
    @Post('/editUserDescription')
    public async editUserDescription(
        @Request() request: express.Request,
        @Body() requestBody: { userDescription: string },
        @Res() validationError: TsoaResponse<409, any>,
        @Res() serverError: TsoaResponse<500, { message: string, details?: any }>
    ): Promise<void> {
        try {
            const schema = Joi.object({ userDescription: Joi.string().required().allow('').max(150) })
            const { error } = schema.validate(requestBody);
            if (error != null) { return validationError(409, error) }

            await editUserDescription(request.app.locals.sqlClient, request.userData.userID, requestBody.userDescription)
            return
        }
        catch (err: any) {
            logger.error('Error in user controller', err)
            return serverError(500, { message: 'Internal Server Error', details: err })
        }
    }

    /**
     * Delete a user completely from the platform
     */
    @Security('jwt')
    @Delete('/deleteUser')
    public async deleteUser(
        @Request() request: express.Request,
        @Res() serverError: TsoaResponse<500, { message: string, details?: any }>
    ): Promise<void> {
        try {
            await deleteUser(request.app.locals.sqlClient, request.userData.userID)
            return
        }
        catch (err) {
            logger.error('Error in user controller', err)
            return serverError(500, { message: 'Internal Server Error', details: err })
        }
    }
}
