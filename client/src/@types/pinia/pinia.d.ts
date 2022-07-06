import { GeneralSocketC } from '@/services/socket'
import 'pinia'

declare module 'pinia' {
  export interface PiniaCustomStateProperties<> {
    socket: GeneralSocketC
  }
}
