import { Ruby } from '../bots/Ruby'
import { Greedy } from '../bots/Greedy'
//import { Raindom } from '../bots/Raindom'
import { runSimulation } from './simulation'

runSimulation(1000, [new Ruby(), new Greedy(), new Ruby(), new Greedy()])
