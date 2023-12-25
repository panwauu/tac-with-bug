//import { Ruby } from '../bots/Ruby'
import { Greedy } from '../bots/Greedy'
//import { Raindom } from '../bots/Raindom'
import { runSimulation } from './simulation'

runSimulation(100, [new Greedy(), new Greedy(), new Greedy(), new Greedy()])
