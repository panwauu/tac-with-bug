import { prepareTestDatabase } from '../test/handleTestDatabase.js'

prepareTestDatabase('tac_test').catch((err) => console.log(err))
