import WebSocket from "ws";
import {ChatDB, clientMessage, UserDB} from "../../env/types";

export function removeFriendWS(this: any, chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any){
    const {login} = message.payload;
    let userI = userDB.findIndex((item) => item.email.toUpperCase() === decoded.email.toUpperCase());
    let requestUserI = userDB.findIndex((item) => item.email.toUpperCase() === login.toUpperCase());

    if (!userDB[userI].friends.includes(login)) {
        return;
    }

    userDB[userI].friends = userDB[userI].friends.filter((item) => item !== login);
    userDB[requestUserI].friends = userDB[requestUserI].friends.filter((item) => item !== decoded.email);

    if (this.WSClients.has(login)) {
        this.WSClients.get(login).forEach((wsL: WebSocket) => {
            wsL.send(
                JSON.stringify({
                    command: "removeFriend",
                    payload: {
                        from: decoded.email,
                        name: userDB[userI].name,
                    },
                })
            );
        });
    }
}