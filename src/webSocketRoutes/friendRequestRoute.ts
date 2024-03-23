import {ChatDB, clientMessage, UserDB} from "../../env/types";
import WebSocket from "ws";

export function friendRequestWS(this: any, chatDB: ChatDB, userDB: UserDB, message: clientMessage, decoded: any) {
    const {login} = message.payload;

    let userI = userDB.findIndex((item) => item.email.toUpperCase() === decoded.email.toUpperCase());

    let addUser = userDB.find(
        (item) => item.email.toUpperCase() === login.toUpperCase()
    );
    let addUserI = userDB.findIndex(
        (item) => item.email.toUpperCase() === login.toUpperCase()
    );

    if (!addUser || decoded.email.toUpperCase() === addUser.email.toUpperCase()) {
        return;
    }

    if (
        userDB[userI].friends.includes(addUser.email) ||
        userDB[userI].friendsRequest.includes(addUser.email)
    ) {
        return;
    }

    userDB[addUserI].friendsOutRequest.push(decoded.email);
    userDB[userI].friendsRequest.push(addUser.email);

    if (this.WSClients.has(login)) {
        this.WSClients.get(login).forEach((wsL: WebSocket) => {
            wsL.send(
                JSON.stringify({
                    command: "friendRequest",
                    payload: {
                        from: {
                            email: userDB[userI].email,
                            name: userDB[userI].name,
                            photo: userDB[userI].photo,
                            lastActivity: userDB[userI].lastActivity
                        },
                    },
                })
            );
        });
    }
}