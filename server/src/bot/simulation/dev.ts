import { Futuro } from '../bots/Futuro'
//import { Ruby } from '../bots/Ruby'
//import { Greedy } from '../bots/Greedy'
import { Raindom } from '../bots/Raindom'
import { runSimulation } from './simulation'

runSimulation(10, [new Futuro(), new Raindom(), new Futuro(), new Raindom()])
