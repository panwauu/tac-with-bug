import Email from 'email-templates'
import path from 'path'
import nodemailer from 'nodemailer'
import type { User } from '../sharedTypes/typesDBuser'
import type { PublicTournament } from '../sharedTypes/typesTournament'
import type { ICalCalendar } from 'ical-generator'
import { locales, fallbackLocale } from '../sharedDefinitions/locales'

const mailTransporter = nodemailer.createTransport({
  host: 'sslout.de',
  port: 465,
  secure: true,
  pool: true,
  auth: {
    user: process.env.mailAddress,
    pass: process.env.mailPassword,
  },
})

const email =
  process.env.NODE_ENV === 'test'
    ? {
        send: async (_: any) => {
          return true
        },
      }
    : new Email({
        views: { root: path.join(__dirname, '..', '..', 'email') },
        transport: mailTransporter,
        message: {
          from: `"Oskar von Tac-With-Bug" ${process.env.mailAddress}`,
        },
        i18n: {
          locales: locales,
          defaultLocale: fallbackLocale,
          directory: path.join(__dirname, '..', '..', 'email', 'locales'),
        },
        send: process.env.NODE_ENV === 'production',
      })

export async function sendMail(receiverMail: string, subject: string, mailbody: string) {
  return email.send({
    message: {
      to: receiverMail,
      subject: subject,
      text: mailbody,
    },
  })
}

export async function sendActivation({ user, token }: { user: User; token: string }) {
  const activationLink = `${process.env.BASE_URL}/#/${user.locale}/?activationUserID=${user.id}&activationToken=${token}`
  return email.send({
    template: 'activation',
    message: { to: user.email },
    locals: { locale: user.locale, name: user.username, link: activationLink },
  })
}

export async function sendNewPassword({ user, password }: { user: User; password: string }) {
  return email.send({
    template: 'newPassword',
    message: { to: user.email },
    locals: { locale: user.locale, name: user.username, newPassword: password },
  })
}

export async function sendNewSubscription({ user }: { user: User }) {
  return email.send({
    template: 'newSubscription',
    message: { to: user.email },
    locals: { locale: user.locale, name: user.username },
  })
}

export async function sendCancelSubscription({ user }: { user: User }) {
  return email.send({
    template: 'cancelSubscription',
    message: { to: user.email },
    locals: { locale: user.locale, name: user.username },
  })
}

export async function sendSubscriptionError({ error }: { error: any }) {
  return email.send({ message: { to: process.env.mailAddress, text: `Subscription Error: ${JSON.stringify(error)}` } })
}

export async function sendSubscriptionPaymentReminder({ user }: { user: User }) {
  return email.send({
    template: 'subscriptionUpcomming',
    message: { to: user.email },
    locals: { locale: user.locale, name: user.username },
  })
}

export async function sendTournamentReminder({ user, tournament, ical }: { user: User; tournament: PublicTournament; ical: ICalCalendar }) {
  return email.send({
    template: 'tournamentReminder',
    message: { to: user.email, icalEvent: ical.toString() },
    locals: { locale: user.locale, name: user.username, tournamentTitle: tournament.title },
  })
}

export async function sendTournamentInvitation({
  user,
  tournamentTitle,
  invitingPlayer,
  teamName,
}: {
  user: User
  tournamentTitle: string
  invitingPlayer: string
  teamName: string
}) {
  return email.send({
    template: 'tournamentInvitation',
    message: { to: user.email },
    locals: { locale: user.locale, name: user.username, invitingPlayer: invitingPlayer, teamName: teamName, tournamentName: tournamentTitle },
  })
}

export async function sendPrivateTournamentInvitation({
  user,
  tournamentTitle,
  invitingPlayer,
  teamName,
}: {
  user: User
  tournamentTitle: string
  invitingPlayer: string
  teamName: string
}) {
  return email.send({
    template: 'privateTournamentInvitation',
    message: { to: user.email },
    locals: { locale: user.locale, name: user.username, invitingPlayer: invitingPlayer, teamName: teamName, tournamentName: tournamentTitle },
  })
}

export async function sendFriendRequestReminder({ user }: { user: User }) {
  return email.send({
    template: 'newFriendRequest',
    message: { to: user.email },
    locals: { locale: user.locale, name: user.username },
  })
}
