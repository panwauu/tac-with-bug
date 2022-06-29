import { GeneralSocketC } from '../services/socket'
import { defineStore } from 'pinia'
import { isLoggedIn } from '../services/useUser'
import router from '../router/index'
import { nextTick } from 'vue'

const storageKey = 'tutorialProgressForUnauthUsers'

nextTick(() => {
    const tutorialStore = useTutorialStore()
    tutorialStore.initStore()
})

export const useTutorialStore = defineStore('tutorial', {
    state: () => ({
        progress: [] as boolean[][]
    }),
    getters: {
        getProgress(state): boolean[][] { return state.progress }
    },
    actions: {
        initStore() {
            this.$state.socket.on('tutorial:loadProgress', (progress) => { this.onLoadProgress(progress) })
        },
        async changeTutorialStepValue(socket: GeneralSocketC, tutorialID: number, tutorialStep: number, done: boolean): Promise<void> {
            if (isLoggedIn.value) {
                const res = await socket.emitWithAck(5000, 'tutorial:changeTutorialStep', { tutorialID, tutorialStep, done })
                if (res.status != 200 || res.data == null) {
                    console.error(`tutorial:resetTutorial failed with error ${res.error}`)
                    router.push({ name: 'Landing' })
                    return
                }
                this.progress = res.data.progress
                this.clearStorage()
            } else {
                this.progress[tutorialID][tutorialStep] = done
                this.saveToStorage()
            }
        },
        async resetTutorialProgress(socket: GeneralSocketC, tutorialID: number): Promise<void> {
            if (isLoggedIn.value) {
                const res = await socket.emitWithAck(5000, 'tutorial:resetTutorial', { tutorialID })
                if (res.status != 200 || res.data == null) {
                    console.error(`tutorial:resetTutorial failed with error ${res.error}`)
                    router.push({ name: 'Landing' })
                    return
                }
                this.progress = res.data.progress
                this.clearStorage()
            } else {
                this.progress[tutorialID] = this.progress[tutorialID].map(() => false)
                this.saveToStorage()
            }
        },
        async loadProgress(socket: GeneralSocketC): Promise<void> {
            if (isLoggedIn.value) {
                socket.emitWithAck(5000, 'tutorial:loadProgress').then((res) => {
                    if (res.status != 200 || res.data == null) { router.push({ name: 'Landing' }); return }
                    this.progress = res.data.progress
                    this.clearStorage()
                })
            } else {
                const res = await socket.emitWithAck(5000, 'tutorial:loadProgress')
                if (res.status != 200 || res.data == null) { router.push({ name: 'Landing' }); return }

                const storageElemente = localStorage.getItem(storageKey)
                if (storageElemente == null) {
                    this.progress = res.data.progress
                    this.saveToStorage()
                }
                else {
                    try {
                        const progressFromStorage = JSON.parse(storageElemente)
                        validateProgress(progressFromStorage, res.data.progress)
                        this.progress = progressFromStorage
                    } catch (err) {
                        this.clearStorage()
                        router.push({ name: 'Landing' })
                        return
                    }
                }
            }
        },
        onLoadProgress(progress: boolean[][]): void {
            if (isLoggedIn.value) {
                this.progress = progress
                this.clearStorage()
            } else {
                const storageElemente = localStorage.getItem(storageKey)
                if (storageElemente == null) {
                    this.progress = progress
                    this.saveToStorage()
                }
                else {
                    try {
                        const progressFromStorage = JSON.parse(storageElemente)
                        validateProgress(progressFromStorage, progress)
                        this.progress = progressFromStorage
                    } catch (err) {
                        this.clearStorage()
                        router.push({ name: 'Landing' })
                        return
                    }
                }
            }
        },
        clearStorage(): void { localStorage.removeItem(storageKey) },
        saveToStorage(): void { localStorage.setItem(storageKey, JSON.stringify(this.progress)) }
    },
})

function validateProgress(progressToValidate: any, referenceProgress: boolean[][]): void {
    if (!Array.isArray(progressToValidate)) { throw new Error('Progress could not be validated') }
    if (progressToValidate.length != referenceProgress.length) { throw new Error('Progress could not be validated') }
    for (let i = 0; i < referenceProgress.length; i++) {
        if (!Array.isArray(progressToValidate[i])) { throw new Error('Progress could not be validated') }
        if (progressToValidate[i].length != referenceProgress[i].length) { throw new Error('Progress could not be validated') }
        if (progressToValidate[i].some((e: any) => typeof e != 'boolean')) { throw new Error('Progress could not be validated') }
    }
}
