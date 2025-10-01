import { createRouter, createWebHashHistory } from 'vue-router'
import { setLocaleAndLoadMessages } from '@/services/i18n'
import { locales, fallbackLocale } from '../../../server/src/sharedDefinitions/locales'
const Game = () => import('@/views/GameView.vue')
const Home = () => import('@/views/HomeView.vue')
const Settings = () => import('@/views/Home/SettingsView.vue')
const Profile = () => import('@/views/Home/ProfileView.vue')
const ProfileOverview = () => import('@/views/Home/Profile/ProfileView.vue')
const ProfileGames = () => import('@/views/Home/Profile/GamesView.vue')
const ProfileFriends = () => import('@/views/Home/Profile/FriendsView.vue')
const ProfileAchievements = () => import('@/views/Home/Profile/AchievementsView.vue')
const ProfileSocials = () => import('@/views/Home/Profile/SocialsView.vue')
const ProfileCards = () => import('@/views/Home/Profile/CardsView.vue')
const Tournament = () => import('@/views/Home/TournamentView.vue')
const TournamentsOverview = () => import('@/views/Home/Tournament/TournamentsOverview.vue')
const PublicTournament = () => import('@/views/Home/Tournament/PublicTournament.vue')
const PrivateTournament = () => import('@/views/Home/Tournament/PrivateTournament.vue')
const Tutorial = () => import('@/views/TutorialView.vue')
const Impressum = () => import('@/components/ImpressumInformation.vue')
const Copyright = () => import('@/components/CopyrightInformation.vue')
const Datenschutz = () => import('@/components/DatenschutzInformation.vue')
const Leaders = () => import('@/views/Home/LeadersView.vue')
const Landing = () => import('@/views/Home/LandingView.vue')
const Stats = () => import('@/views/Home/StatsView.vue')
const TutorialOverview = () => import('@/views/Home/TutorialOverview.vue')
const Subscription = () => import('@/views/Home/SubscriptionView.vue')
const FAQ = () => import('@/views/Home/FAQ.vue')
const HallOfFame = () => import('@/views/Home/HallOfFame.vue')
const PlayerSearch = () => import('@/views/Home/PlayerSearch.vue')
const Advertisement = () => import('@/views/Home/AdvertisementView.vue')
const ResetPassword = () => import('@/views/Home/ResetPassword.vue')

const regexp = locales.join('|')
const routes = [
  {
    path: `/:locale(${regexp})?/game`,
    name: 'Game',
    component: Game,
  },
  {
    path: `/:locale(${regexp})?/tutorial`,
    name: 'Tutorial',
    component: Tutorial,
  },
  {
    path: `/:locale(${regexp})?`,
    component: Home,
    children: [
      {
        path: 'settings',
        name: 'Settings',
        component: Settings,
      },
      {
        path: 'impressum',
        name: 'Impressum',
        component: Impressum,
      },
      {
        path: 'copyright',
        name: 'Copyright',
        component: Copyright,
      },
      {
        path: 'datenschutz',
        name: 'Datenschutz',
        component: Datenschutz,
      },
      {
        path: 'leaders',
        name: 'Leaders',
        component: Leaders,
      },
      {
        path: 'profile/:username',
        component: Profile,
        props: true,
        children: [
          {
            path: '',
            name: 'Profile',
            props: true,
            component: ProfileOverview,
          },
          {
            path: 'games',
            name: 'Profile-Games',
            props: true,
            component: ProfileGames,
          },
          {
            path: 'cards',
            name: 'Profile-Cards',
            props: true,
            component: ProfileCards,
          },
          {
            path: 'friends',
            name: 'Profile-Friends',
            props: true,
            component: ProfileFriends,
          },
          {
            path: 'achievements',
            name: 'Profile-Achievements',
            props: true,
            component: ProfileAchievements,
          },
          {
            path: 'socials',
            name: 'Profile-Socials',
            props: true,
            component: ProfileSocials,
          },
        ],
      },
      {
        path: 'tournament',
        component: Tournament,
        props: true,
        children: [
          {
            path: 'overview',
            name: 'TournamentOverview',
            component: TournamentsOverview,
          },
          {
            path: 'private/:id',
            name: 'PrivateTournament',
            props: true,
            component: PrivateTournament,
          },
          {
            path: 'public/:id',
            name: 'PublicTournament',
            props: true,
            component: PublicTournament,
          },
        ],
      },
      {
        path: 'stats',
        name: 'Stats',
        component: Stats,
      },
      {
        path: 'tutorialoverview',
        name: 'TutorialOverview',
        component: TutorialOverview,
      },
      {
        path: 'subscription',
        name: 'Subscription',
        component: Subscription,
      },
      {
        path: 'faq',
        name: 'FAQ',
        component: FAQ,
      },
      {
        path: 'hof',
        name: 'HOF',
        component: HallOfFame,
      },
      {
        path: 'playersearch',
        name: 'PlayerSearch',
        component: PlayerSearch,
      },
      {
        path: 'advert',
        name: 'Advertisement',
        component: Advertisement,
      },
      {
        path: 'resetpassword/:username/:token',
        name: 'ResetPassword',
        props: true,
        component: ResetPassword,
      },
      {
        path: '',
        name: 'Landing',
        component: Landing,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  // Redirect to Advert when first visited
  if (localStorage.getItem('alreadyVisited') == null) {
    localStorage.setItem('alreadyVisited', 'true')
    if (to.name === 'Landing') {
      return next({ name: 'Advertisement' })
    }
  }

  //Redirect unnamed Routes to Landing to avoid unmatched Routes
  if (to.name == null) {
    return next({ name: 'Landing' })
  }

  let toLocale = to.params?.locale as string | undefined
  const fromLocale = from.params?.locale as string | undefined

  if (fromLocale != null && toLocale === undefined) {
    to.params.locale = fromLocale
    return next(to)
  }

  if (toLocale == null || toLocale === '') {
    toLocale = fallbackLocale
  }

  if (!(locales as string[]).includes(toLocale)) {
    console.log(`Push to another locale as ${toLocale} is not supported`)
    toLocale = fallbackLocale
  }

  setLocaleAndLoadMessages(toLocale)

  return next()
})

export default router
