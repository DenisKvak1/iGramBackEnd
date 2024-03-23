import WebSocket from "ws";
import {ChatDB, clientMessage, UserDB} from "../../env/types";

export function messageWS(this: any, chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any){
    const {from, to, text} = message.payload;

    if (decoded.email !== from) {
        return;
    }

    const chatIndex = chatDB.findIndex((item) => item.id === to);
    if (chatIndex < 0) {
        return;
    }

    let user = userDB.find((item) => item.email === decoded.email);
    if (!user) return;

    chatDB[chatIndex].history.push({
        from,
        text,
        fromName: user.name,
        timestamp: new Date().toISOString(),
    });

    this.WSClients.forEach((wss: WebSocket[], key: string) => {
        if (chatDB[chatIndex].members.includes(key)) {
            wss.forEach((wsL: WebSocket) => {
                wsL.send(
                    JSON.stringify({
                        command: "message",
                        payload: {
                            from: {
                                email: user?.email,
                                name: user?.name,
                                photo: user?.photo,
                                lastActivity: user.lastActivity
                            },
                            fromName: user.name,
                            to,
                            text,
                            timestamp: new Date().toISOString(),
                        },
                    })
                );
            });
        }
    });
}