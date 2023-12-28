import { Futuro } from '../bots/Futuro'
import { Ruby } from '../bots/Ruby'
//import { Greedy } from '../bots/Greedy'
//import { Raindom } from '../bots/Raindom'
import { runSimulation } from './simulation'

runSimulation(100, [new Futuro(), new Ruby(), new Futuro(), new Ruby()])
