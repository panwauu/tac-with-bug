import type pg from 'pg';

import * as EmailValidator from 'email-validator';
import { Result, ok, err } from 'neverthrow';
import bcrypt from 'bcrypt';
import { isUsernameFree, isEmailFree } from '../services/user';
import { locales } from '../../../shared/shared/locales';

export type UsernameValidationErrors = 'USERNAME_TOO_SHORT' | 'USERNAME_TOO_LONG' | 'USERNAME_INVALID_LETTERS' | 'USERNAME_NOT_AVAILABLE'
export async function validateUsername(sqlClient: pg.Pool, username: string): Promise<Result<string, UsernameValidationErrors>> {
    if (username.length < 3) { return err('USERNAME_TOO_SHORT') }
    if (username.length > 12) { return err('USERNAME_TOO_LONG') }

    const letters = /^[A-Za-z\u00E4\u00F6\u00FC\u00C4\u00D6\u00DC\u00df]+$/;
    if (!username.match(letters)) { return err('USERNAME_INVALID_LETTERS') }

    const usernameAvailable = await isUsernameFree(sqlClient, username)
    if (usernameAvailable === false) { return err('USERNAME_NOT_AVAILABLE') }

    return ok(username)
}

export type EmailValidationErrors = 'EMAIL_INVALID' | 'EMAIL_NOT_AVAILABLE'
export async function validateEmail(sqlClient: pg.Pool, email: string): Promise<Result<string, EmailValidationErrors>> {
    if (!email || !EmailValidator.validate(email)) { return err('EMAIL_INVALID') }

    const emailAvailable = await isEmailFree(sqlClient, email)
    if (emailAvailable === false) { return err('EMAIL_NOT_AVAILABLE') }

    return ok(email)
}

export type PasswordValidationErrors = 'PASSWORD_TOO_SHORT' | 'PASSWORD_TOO_LONG'
export function validatePassword(password: string): Result<string, PasswordValidationErrors> {
    if (password.length < 8) { return err('PASSWORD_TOO_SHORT') }
    if (password.length > 64) { return err('PASSWORD_TOO_LONG') }
    return ok(password)
}

export type ComparePasswordsErrors = 'PASSWORD_INCORRECT'
export async function comparePasswords(password: string, hash: string): Promise<Result<string, ComparePasswordsErrors>> {
    const equal = await bcrypt.compare(password, hash)
    if (!equal) { return err('PASSWORD_INCORRECT') }
    return ok(password)
}

export type LocaleValidationErrors = 'LOCALE_NOT_AVAILABLE'
export function validateLocale(locale: string): Result<string, LocaleValidationErrors> {
    if (!(locales as readonly string[]).includes(locale)) { return err('LOCALE_NOT_AVAILABLE') }
    return ok(locale)
}