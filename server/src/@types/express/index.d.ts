export {}
declare global {
  namespace Express {
    interface Request {
      userData: {
        userID: number
      }
    }
  }
}
