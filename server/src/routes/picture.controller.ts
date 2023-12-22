import type express from 'express'
import { Controller, Get, Delete, Query, Route, Request, Security, Post, Res, TsoaResponse } from 'tsoa'

import multer from 'multer'
import { queryProfilePicture, loadProfilePictureToDB, selectRandomProfilePicture } from '../services/picture'
import type { UserIdentifier } from '../sharedTypes/typesDBuser'

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
    await loadProfilePictureToDB(request.app.locals.sqlClient, request.userData.userID, request.file.buffer)
  }

  private handleFile(request: express.Request): Promise<any> {
    const multerSingle = multer({ limits: { fileSize: 8000000 } }).single('profilePic')
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
