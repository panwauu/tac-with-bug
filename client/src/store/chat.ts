import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { watch } from 'vue'
import router from '@/router'

export const useChatStore = defineStore('chat', {
    state: () => ({
        displayChat: useStorage('tacWithBugChatVisible', false, sessionStorage),
        chatPosition: useStorage('tacWithBugChatPosition', 'right', localStorage),
        rightChatSize: useStorage('tacWithBugChatSizeRight', 20, localStorage),
        bottomChatSize: useStorage('tacWithBugChatSizeBottom', 20, localStorage),
        collapseButton: false,
        displayChatMenu: true,
        responsiveMode: false,
    }),
    getters: {},
    actions: {
        openChat() { this.displayChat = true },
        closeChat() { this.displayChat = false },
        switchPosition(position: 'right' | 'bottom' | 'overlay') { this.chatPosition = position },
        setChatSize(size: number) {
            const clampedSize = Math.min(100, Math.max(0, Math.floor(100 - size)))
            if (this.chatPosition === 'right') {
                this.rightChatSize = Math.floor(clampedSize)
            } else if (this.chatPosition === 'bottom') {
                this.bottomChatSize = Math.floor(clampedSize)
            }
        },
        updateButtonCollapse() {
            const element = document.getElementById('gameboard');
            this.collapseButton =
                element != null &&
                window.innerWidth > window.innerHeight &&
                window.innerWidth - element.getBoundingClientRect().right < 76;
        },
        toggleChatMenu() { this.displayChatMenu = !this.displayChatMenu },
        closeChatMenu() { this.displayChatMenu = false },
        setResponsiveMode(responsive: boolean) { this.responsiveMode = responsive },
    }
})

watch(() => router.currentRoute.value.name, () => {
    const chatStore = useChatStore()
    setTimeout(() => { chatStore.updateButtonCollapse() }, 1000);
})