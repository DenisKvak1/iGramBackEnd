import {v4 as uuidv4} from "uuid";
import WebSocket from "ws";
import {ChatDB, clientMessage, UserDB} from "../../env/types";

export function chatCreatedWS(this: any, chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any){
    const {logins, chatName}: { logins: Array<string>, chatName: string } = message.payload as any;

    let userI = userDB.findIndex((item) => item.email.toUpperCase() === decoded.email.toUpperCase());

    let error;
    logins.forEach((item) => {
        if (!userDB[userI].friends.includes(item)) {
            error = true;
        }
    });

    if (error) {
        return;
    }

    let newChat: {
        id: string;
        chatName: string;
        members: string[];
        photo: string;
        history: any[];
    } = {
        id: uuidv4(),
        chatName: chatName,
        members: [...logins, decoded.email],
        photo: "http://127.0.0.1:3000/img/standartAvatar.png",
        history: [],
    };

    chatDB.push(newChat);

    logins.forEach((item) => {
        if (this.WSClients.has(item)) {
            this.WSClients.get(item).forEach((wsL: WebSocket) => {
                wsL.send(
                    JSON.stringify({
                        command: "chatCreated",
                        payload: {
                            from: decoded.email,
                            chat: newChat,
                        },
                    })
                );
            });
        }
    });

    if (this.WSClients.has(decoded.email)) {
        this.WSClients.get(decoded.email).forEach((wsL: WebSocket) => {
            wsL.send(
                JSON.stringify({
                    command: "chatCreated",
                    payload: {
                        from: decoded.email,
                        chat: newChat,
                    },
                })
            );
        });
    }
}