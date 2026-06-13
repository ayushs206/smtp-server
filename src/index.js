import "./envLoad.js";

import { SMTPServer } from "smtp-server";

const smtpServer = new SMTPServer({
    allowInsecureAuth: true,
    authOptional: true,
    onConnect(session, callback) {
        console.log("Client connected:", session.remoteAddress);
        callback();
    },
    onMailFrom(address, session, callback) {
        console.log("MAIL FROM:", address.address);
        callback();
    },
    onRcptTo(address, session, callback) {
        console.log("RCPT TO:", address.address);
        callback();
    },
    onData(stream, session, callback) {
        let emailData = "";
        stream.on("data", (chunk) => {
            emailData += chunk.toString();
        });
        stream.on("end", () => {
            console.log("Email received:\n", emailData);
            callback();
        });
    }
});

smtpServer.listen(process.env.SMTP_PORT || 25, () => {
    console.log(`SMTP server is listening on port ${process.env.SMTP_PORT || 25}`);
});

smtpServer.on("error", (err) => {
    console.error("SMTP ERROR:", err);
});

process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);