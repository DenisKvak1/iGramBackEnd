import WebSocket from "ws";
import {ChatDB, clientMessage, UserDB} from "../../env/types";

export function leaveChatWS(this: any, chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any){
    const {chatID} = message.payload;
    const chatI = chatDB.findIndex((item) => item.id === chatID);
    const user = userDB.find((item) => item.email === decoded.email)
    if (!chatDB) return;
    if (!user) return;
    if(chatI<0) return;
    chatDB[chatI].members = chatDB[chatI].members.filter((item) => item !== decoded.email);
    if (chatDB[chatI].members.length === 0) {
        chatDB.splice(chatI, 1);
    }
    this.WSClients.forEach((wss: any, key: any) => {
        if (chatDB[chatI]?.members.includes(key) || key === decoded.email) {
            wss.forEach((wsL: WebSocket) => {
                wsL.send(
                    JSON.stringify({
                        command: "leaveChat",
                        payload: {
                            chatID,
                            user: {
                                email: user.email,
                                name: user.name,
                                photo: user.photo,
                                lastActivity: user.lastActivity
                            },
                        },
                    })
                );
            });
        }
    });
}