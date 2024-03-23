import {ChatDB, clientMessage, UserDB} from "../../env/types";
import WebSocket from "ws";

export function friendResponseWS(this: any, chatDB: ChatDB, userDB: UserDB, message: clientMessage, decoded: any) {
    const {login, accept} = message.payload;

    let userI = userDB.findIndex((item) => item.email.toUpperCase() === decoded.email.toUpperCase());
    let requestUserI = userDB.findIndex((item) => item.email.toUpperCase() === login.toUpperCase());

    if (requestUserI < 0 || !userDB[userI].friendsOutRequest.includes(login)) {
        return;
    }

    userDB[userI].friendsOutRequest = userDB[userI].friendsOutRequest.filter((item) => item !== login);
    userDB[requestUserI].friendsRequest = userDB[requestUserI].friendsRequest.filter((item) => item !== decoded.email);

    if (!accept) {
        if (this.WSClients.has(login)) {
            this.WSClients.get(login).forEach((wsL: WebSocket) => {
                wsL.send(
                    JSON.stringify({
                        command: "friendResponse",
                        payload: {
                            from: decoded.email,
                            name: userDB[userI].name,
                            accept,
                        },
                    })
                );
            });
        }

        this.saveDataToJSONFile(userDB, this.userDBPath);
        this.saveDataToJSONFile(chatDB, this.chatDBPath);
        return;
    }

    userDB[userI].friends.push(login);
    userDB[requestUserI].friends.push(decoded.email);

    if (this.WSClients.has(login)) {
        this.WSClients.get(login).forEach((wsL: WebSocket) => {
            wsL.send(
                JSON.stringify({
                    command: "friendResponse",
                    payload: {
                        from: decoded.email,
                        name: userDB[userI].name,
                        accept,
                    },
                })
            );
        });
    }
}