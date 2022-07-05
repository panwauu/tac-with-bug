export interface chatMessage {
    id: number;
    body: string;
    created: string;
    sender: string | null;
}

export interface chatElement {
    chatid: number;
    groupChat: boolean;
    groupTitle: string;
    created: string;
    lastMessage: string;
    players: string[];
    numberOfUnread: number;
}
