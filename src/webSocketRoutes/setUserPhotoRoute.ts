import {ChatDB, clientMessage, UserDB} from "../../env/types";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import WebSocket from "ws";

export function setUserPhotoWS(this: any, chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any){
    const {photo} = message.payload;
    if (!photo) return;

    let userI = userDB.findIndex((item) => item.email === decoded.email);
    const fileName = `${crypto.createHash('sha256').update(userDB[userI].email).digest('hex')}.png`;
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
        userDB[userI].photo = `http://127.0.0.1:3000/uploads/${fileName}`;
        this.saveDataToJSONFile(userDB, this.userDBPath);
        this.WSClients.forEach((wss: any, key: any) => {
            if (userDB[userI].friends.includes(key) || userDB[userI].email === decoded.email) {
                wss.forEach((wsL: WebSocket) => {
                    wsL.send(
                        JSON.stringify({
                            command: "setUserPhoto",
                            payload: {
                                user: {
                                    email: userDB[userI].email,
                                    name: userDB[userI].name,
                                    photo: `http://127.0.0.1:3000/uploads/${fileName}`
                                },
                            },
                        })
                    );
                });
            }
        });
    });
}