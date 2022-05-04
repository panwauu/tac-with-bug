import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env'), debug: true })

if (process.env.NODE_ENV !== 'production') {
    process.env.jwtSecret = 'SECRET_KEY'
    process.env.BASE_URL = 'http://localhost:3000'
    process.env.paypal_Client_ID = 'AeruGzWwXA-84qtXFLMuMF7eQKRFeVgcPf7JgrHIB37cTmepkqLU9hwH194oj6Ty2IY6EPHD-T37089Z'
    process.env.PAYPAL_PLAN_ID_MONTHLY = 'P-5LJ40838UY5547356MFJNNQY'
    process.env.PAYPAL_PLAN_ID_QUATERLY = 'P-57X95266S9078521XMFJNNMQ'
    process.env.PAYPAL_PLAN_ID_YEARLY = 'P-8RU48640FT6304941MFJNMUQ'
}