import type express from 'express'
import {
  getEmailNotificationSettings,
  GetEmailNotificationSettingsError,
  EmailNotificationSettingsType,
  SetEmailNotificationSettingsError,
  setEmailNotificationSettings,
} from '../services/settings'
import { Controller, Get, Post, Body, Route, Request, Security, TsoaResponse, Res } from 'tsoa'

import { LocaleValidationErrors, validateLocale } from '../helpers/validationHelpers'

@Route('/')
export class SettingsController extends Controller {
  /**
   * Set preferred locale of user
   */
  @Security('jwt')
  @Post('/setLocale')
  public async setSettingsLocale(
    @Request() request: express.Request,
    @Body() reqBody: { locale: string },
    @Res() validationError: TsoaResponse<409, LocaleValidationErrors>
  ): Promise<void> {
    const localeResult = validateLocale(reqBody.locale)
    if (localeResult.isErr()) {
      return validationError(409, localeResult.error)
    }
    await request.app.locals.sqlClient.query('UPDATE users SET locale = $1 WHERE id = $2;', [reqBody.locale, request.userData.userID])
  }

  /**
   * Set preferred locale of user
   */
  @Security('jwt')
  @Post('/setColorBlindnessFlag')
  public async setColorBlindnessFlag(@Request() request: express.Request, @Body() reqBody: { colorBlindnessFlag: boolean }): Promise<void> {
    await request.app.locals.sqlClient.query('UPDATE users SET color_blindness_flag = $1 WHERE id = $2;', [reqBody.colorBlindnessFlag, request.userData.userID])
  }

  /**
   * Get preferred game positions
   */
  @Security('jwt')
  @Get('/getGameDefaultPositions')
  public async getGameDefaultPositions(@Request() request: express.Request): Promise<number[]> {
    const dbRes = await request.app.locals.sqlClient.query('SELECT game_default_position FROM users WHERE id = $1;', [request.userData.userID])
    return dbRes.rows[0].game_default_position
  }

  /**
   * Set preferred game positions
   */
  @Security('jwt')
  @Post('/setGameDefaultPositions')
  public async setGameDefaultPositions(
    @Request() request: express.Request,
    @Body() reqBody: { gameDefaultPositions: number[] },
    @Res() validationError: TsoaResponse<409, any>
  ): Promise<void> {
    if (
      !Number.isInteger(reqBody.gameDefaultPositions[0]) ||
      !Number.isInteger(reqBody.gameDefaultPositions[1]) ||
      reqBody.gameDefaultPositions[0] > 3 ||
      reqBody.gameDefaultPositions[0] < -1 ||
      reqBody.gameDefaultPositions[1] > 5 ||
      reqBody.gameDefaultPositions[1] < -1
    ) {
      return validationError(409, 'gameDefaultPositions incorrect')
    }

    await request.app.locals.sqlClient.query('UPDATE users SET game_default_position = $1 WHERE id = $2;', [reqBody.gameDefaultPositions, request.userData.userID])
  }

  /**
   * Get notification settings
   */
  @Security('jwt')
  @Get('/getEmailNotificationSettings')
  public async getEmailNotificationSettings(
    @Request() request: express.Request,
    @Res() serverError: TsoaResponse<500, GetEmailNotificationSettingsError>
  ): Promise<EmailNotificationSettingsType> {
    const settings = await getEmailNotificationSettings(request.app.locals.sqlClient, request.userData.userID)
    if (settings.isErr()) return serverError(500, settings.error)
    return settings.value
  }

  /**
   * Set notification setting
   */
  @Security('jwt')
  @Post('/setEmailNotificationSettings')
  public async setEmailNotificationSettings(
    @Request() request: express.Request,
    @Body() settingsObject: EmailNotificationSettingsType,
    @Res() serverError: TsoaResponse<500, SetEmailNotificationSettingsError>
  ): Promise<EmailNotificationSettingsType> {
    const changedSettings = await setEmailNotificationSettings(request.app.locals.sqlClient, request.userData.userID, settingsObject)
    if (changedSettings.isErr()) return serverError(500, changedSettings.error)
    return changedSettings.value
  }
}
