import WebSocket from "ws";
import {ChatDB, clientMessage, UserDB} from "../../env/types";

export function friendAddedToChatWS(this: any, chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any){
    const {login, chatID} = message.payload;

    let userI = userDB.findIndex((item) => item.email.toUpperCase() === decoded.email.toUpperCase());
    let chatI = chatDB.findIndex((item) => item.id === chatID);
    let addUser = userDB.find((item)=>item.email.toUpperCase() === login.toUpperCase())

    if(!addUser){
        return;
    }
    if (userI < 0 || chatI < 0) {
        return;
    }

    if (!userDB[userI].friends.includes(login)) {
        return;
    }

    if (chatDB[chatI].members.includes(login)) {
        return;
    }

    chatDB[chatI].members.push(login);

    this.WSClients.forEach((wss: any, key: any) => {
        if (chatDB[chatI]?.members.includes(key) || key === decoded.email) {
            wss.forEach((wsL: WebSocket) => {
                wsL.send(
                    JSON.stringify({
                        command: "friendAddedToChat",
                        payload: {
                            user: {
                                email: addUser.email,
                                name: addUser.name,
                                photo: addUser.photo,
                                lastActivity: addUser.lastActivity
                            },
                            chatID: chatDB[chatI].id,
                        },
                    })
                );
            });
        }
    });
}