export type User = {
    email: string;
    name: string;
    password: string;
    friendsRequest: string[];
    friendsOutRequest: string[];
    friends: string[];
    photo: string;
    lastActivity?: string
}
export type clientUser = {
    email: string;
    name: string;
    photo: string;
    lastActivity: string
}
export type Chat = {
    id: string;
    chatName: string;
    members: string[];
    history: {
        from: string;
        fromName?: string;
        text: string;
        timestamp: string;
    }[];
    photo: string;
}
export type JSONResponse = {
    status: string;
    user?: {
        email: string;
        name: string;
        photo: string;
    }
    requests?: clientUser[];
    Error?: string;
    jwt?: string;
    email?: string;
    data?: any
}
export type LoginValue = {
    email: string;
    password: string;
};

export type options = {
    name: string;
}
export type clientMessage = {
    command: string
    payload: {

        [key:string]: any
    }
}
export type iCommandActionList = {
    message: (message:clientMessage) => void,
    friendRequest: (message:clientMessage) => void
    friendResponse: (message:clientMessage) => void
    removeFriend: (message:clientMessage) => void
    chatCreated: (message:clientMessage)=> void
    friendAddedToChat: (message:clientMessage)=>void
    setChatPhoto: (message:clientMessage)=>void
    setUserPhoto: (message:clientMessage)=>void
    leaveChat: (message:clientMessage)=>void

    [key:string]: (message:clientMessage)=>void
}
export type ChatDB = Chat[];
export type UserDB = User[];