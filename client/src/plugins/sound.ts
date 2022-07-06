import { reactive } from 'vue'

export interface sound {
  audios: { [key: string]: HTMLAudioElement }
  volume: number
  $play: (sound: string) => void
  $stop: () => void
  $volume: (volume: number) => void
}

const storageResult = localStorage.getItem('soundvolume')
const volume = storageResult != null ? parseInt(storageResult) : 100

import notiSound from '../assets/sounds/noti.mp3'
import wonSound from '../assets/sounds/won.mp3'
import lostSound from '../assets/sounds/lost.mp3'

export const sound = reactive<sound>({
  audios: {
    noti: new Audio(notiSound),
    won: new Audio(wonSound),
    lost: new Audio(lostSound),
  },
  volume: volume,
  $play(sound: string) {
    this.$stop()
    this.audios?.[sound].play()
  },
  $volume(inputVolume: number) {
    sound.volume = Math.max(0, Math.min(100, Math.round(inputVolume)))
    localStorage.setItem('soundvolume', sound.volume.toString())
    Object.values(this.audios).forEach((a) => (a.volume = sound.volume / 100))
  },
  $stop() {
    Object.values(this.audios).forEach((a) => {
      a.pause()
      a.currentTime = 0
    })
  },
})

sound.$volume(volume)
