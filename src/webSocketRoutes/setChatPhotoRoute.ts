import crypto from "crypto";
import path from "path";
import fs from "fs";
import WebSocket from "ws";
import {ChatDB, clientMessage, UserDB} from "../../env/types";

export function setChatPhotoWS(this: any, chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any){
    const {chatID} = message.payload;
    if (!chatID) return;

    let chat = chatDB.find((item) => item.id === chatID);
    let chatI = chatDB.findIndex((item => item.id === chatID));


    if (!chat?.members.includes(decoded.email)) return;

    const fileName = `${crypto.createHash('sha256').update(chatDB[chatI].id).digest('hex')}.png`;
    const buf = Object.values(message.payload.photo);
    const buffer = Buffer.from(buf as any);
    const uploadPath = path.join(__dirname, 'uploads');

    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath);
    }
    const filePath = path.join(uploadPath, fileName);

    fs.writeFile(filePath, buffer, (err) => {
        if (err) {
            console.error('Error saving file:', err);
            return;
        }
        chatDB[chatI].photo = `http://127.0.0.1:3000/uploads/${fileName}`;
        this.saveDataToJSONFile(chatDB, this.chatDBPath);
        this.WSClients.forEach((wss: any, key: any) => {
            if (chatDB[chatI].members.includes(key)) {
                wss.forEach((wsL: WebSocket) => {
                    wsL.send(
                        JSON.stringify({
                            command: "setChatPhoto",
                            payload: {
                                chatID: chatDB[chatI].id,
                                photo: `http://127.0.0.1:3000/uploads/${fileName}`,
                            },
                        })
                    );
                });
            }
        });
    });
}