import { Bot } from '../bots/bots'
import { runSimulation } from './simulation'

runSimulation(1, [Bot.Futuro, Bot.Greedy, Bot.Futuro, Bot.Greedy])
