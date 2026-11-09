import type express from 'express'
import { Controller, Get, Delete, Query, Route, Request, Security, Post, Res, TsoaResponse } from 'tsoa'

import multer from 'multer'
import { queryProfilePicture, loadProfilePictureToDB, selectRandomProfilePicture, resizeGroupPicture } from '../services/picture'
import { queryGroupPicture, setGroupPicture } from '../services/chat'
import { updateOverviewForAll } from '../socket/chat'
import type { UserIdentifier } from '../sharedTypes/typesDBuser'
import { getUser } from '../services/user'

@Route('/')
export class PictureController extends Controller {
  /**
   * Get profile picture of player
   */
  @Security('jwt')
  @Get('/getProfilePicture')
  public async getProfilePicture(
    @Request() request: express.Request,
    @Res() invalidUsernameError: TsoaResponse<400, { message: string; details?: any }>,
    @Query() username?: string
  ): Promise<string> {
    this.setHeader('Cache-Control', 'no-cache')
    this.setHeader('Content-Type', 'image/jpeg; charset=UTF-8')

    const identifier: UserIdentifier = username ? { username } : { id: request.userData.userID }
    const pictureRes = await queryProfilePicture(request.app.locals.sqlClient, identifier)
    if (pictureRes.isErr()) {
      return invalidUsernameError(400, { message: pictureRes.error })
    }
    return 'data:image/jpeg;base64,' + pictureRes.value
  }

  /**
   * Upload custom Profile Picture
   */
  @Security('jwt')
  @Post('uploadProfilePicture')
  public async uploadProfilePicture(@Request() request: express.Request, @Res() serverError: TsoaResponse<500, { message: string; details?: any }>): Promise<void> {
    await this.handleFile(request)
    if (request.file?.buffer === undefined) {
      return serverError(500, { message: 'Internal Server Error' })
    }

    const user = await getUser(request.app.locals.sqlClient, { id: request.userData.userID })
    if (user.isErr()) {
      return serverError(500, { message: 'Internal Server Error', details: 'User not found' })
    }
    if (user.value.blockedByModerationUntil != null) {
      return serverError(500, { message: 'User blocked by moderation', details: 'User blocked by moderation' })
    }

    await loadProfilePictureToDB(request.app.locals.sqlClient, request.userData.userID, request.file.buffer)
  }

  /**
   * Get the picture of a group chat (only for its members)
   */
  @Security('jwt')
  @Get('/getGroupPicture')
  public async getGroupPicture(
    @Request() request: express.Request,
    @Res() groupPictureError: TsoaResponse<400, { message: string; details?: any }>,
    @Query() chatid: number
  ): Promise<string> {
    this.setHeader('Cache-Control', 'no-cache')
    const pictureRes = await queryGroupPicture(request.app.locals.sqlClient, request.userData.userID, chatid)
    if (pictureRes.isErr()) {
      return groupPictureError(400, { message: pictureRes.error })
    }
    return 'data:image/jpeg;base64,' + pictureRes.value
  }

  /**
   * Upload the picture of a group chat (only for its members)
   */
  @Security('jwt')
  @Post('uploadGroupPicture')
  public async uploadGroupPicture(
    @Request() request: express.Request,
    @Res() serverError: TsoaResponse<500, { message: string; details?: any }>,
    @Res() groupPictureError: TsoaResponse<400, { message: string; details?: any }>,
    @Query() chatid: number
  ): Promise<void> {
    await this.handleFile(request, 'groupPic')
    if (request.file?.buffer === undefined) {
      return serverError(500, { message: 'Internal Server Error' })
    }

    const user = await getUser(request.app.locals.sqlClient, { id: request.userData.userID })
    if (user.isErr()) {
      return serverError(500, { message: 'Internal Server Error', details: 'User not found' })
    }
    if (user.value.blockedByModerationUntil != null) {
      return serverError(500, { message: 'User blocked by moderation', details: 'User blocked by moderation' })
    }

    let picture: Buffer
    try {
      picture = await resizeGroupPicture(request.file.buffer)
    } catch {
      return groupPictureError(400, { message: 'INVALID_IMAGE' })
    }
    const res = await setGroupPicture(request.app.locals.sqlClient, request.userData.userID, chatid, picture)
    if (res.isErr()) {
      return groupPictureError(400, { message: res.error })
    }
    await updateOverviewForAll(request.app.locals.sqlClient, res.value)
  }

  /**
   * Remove the picture of a group chat (only for its members)
   */
  @Security('jwt')
  @Delete('/deleteGroupPicture')
  public async deleteGroupPicture(
    @Request() request: express.Request,
    @Res() groupPictureError: TsoaResponse<400, { message: string; details?: any }>,
    @Query() chatid: number
  ): Promise<void> {
    const res = await setGroupPicture(request.app.locals.sqlClient, request.userData.userID, chatid, null)
    if (res.isErr()) {
      return groupPictureError(400, { message: res.error })
    }
    await updateOverviewForAll(request.app.locals.sqlClient, res.value)
  }

  private handleFile(request: express.Request, field = 'profilePic'): Promise<any> {
    const multerSingle = multer({ limits: { fileSize: 8000000 } }).single(field)
    return new Promise((resolve, reject) => {
      // undefined need to receive express.Response object
      multerSingle(request, undefined as any, async (error) => {
        if (error) {
          reject(error)
        }
        resolve('file will be in request.profilePic, it is a buffer')
      })
    })
  }

  /**
   * Replace Picture by random one
   */
  @Security('jwt')
  @Delete('/deleteProfilePicture')
  public async deleteProfilePicture(@Request() request: express.Request): Promise<void> {
    const userID: number = request.userData.userID
    await selectRandomProfilePicture(request.app.locals.sqlClient, userID)
  }
}
