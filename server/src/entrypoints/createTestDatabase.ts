import { prepareTestDatabase } from '../test/handleTestDatabase'

prepareTestDatabase('tac_test').catch((err) => console.log(err))
