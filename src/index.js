import "./envLoad.js";

import fs from "fs/promises";
import path from "path";

import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
// import { authenticate } from "mailauth";

const SMTP_PORT = Number(process.env.SMTP_PORT || 25);
const MAX_MESSAGE_SIZE = 25 * 1024 * 1024; // 25 MB

import axios from "axios";

// const VALID_RECIPIENTS = new Set([
//     "admin@example.com",
//     "support@example.com"
// ]);

const smtpServer = new SMTPServer({
    authOptional: true,
    allowInsecureAuth: false,

    disabledCommands: ["AUTH"],

    size: MAX_MESSAGE_SIZE,

    onConnect(session, callback) {
        console.log(
            `[CONNECT] ${session.remoteAddress}`
        );

        callback();
    },

    onMailFrom(address, session, callback) {
        console.log(
            `[MAIL FROM] ${address.address}`
        );

        if (!address.address?.includes("@")) {
            return callback(
                new Error("550 Invalid sender")
            );
        }

        callback();
    },

    onRcptTo(address, session, callback) {
        const recipient = address.address.toLowerCase();

        console.log(
            `[RCPT TO] ${recipient}`
        );

        // if (!VALID_RECIPIENTS.has(recipient)) {
        //     return callback(
        //         new Error("550 User does not exist")
        //     );
        // }

        callback();
    },

    async onData(stream, session, callback) {
        try {
            const chunks = [];

            stream.on("data", chunk => {
                chunks.push(chunk);
            });

            stream.on("error", callback);

            stream.on("end", async () => {
                try {
                    const rawEmail = Buffer.concat(chunks);

                    // Store raw message
                    const fileName =
                        `${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2)}.eml`;

                    const emailDir = path.resolve("./emails");

                    await fs.mkdir(emailDir, {
                        recursive: true
                    });

                    await fs.writeFile(
                        path.join(emailDir, fileName),
                        rawEmail
                    );

                    // SPF / DKIM / DMARC
                    // const authResult =
                    //     await authenticate(rawEmail);

                    // Parse message
                    const mail =
                        await simpleParser(rawEmail);

                    const parsedMail = {
                        messageId: mail.messageId,
                        date: mail.date,

                        from: mail.from?.value || [],
                        to: mail.to?.value || [],
                        cc: mail.cc?.value || [],
                        bcc: mail.bcc?.value || [],

                        subject: mail.subject,

                        text: mail.text,
                        html: mail.html,

                        attachments:
                            mail.attachments.map(a => ({
                                filename: a.filename,
                                size: a.size,
                                contentType: a.contentType
                            })),

                        // authentication: {
                        //     spf:
                        //         authResult.spf?.status
                        //             ?.result,
                        //     dkim:
                        //         authResult.dkim?.results,
                        //     dmarc:
                        //         authResult.dmarc?.status
                        //             ?.result
                        // }
                    };

                    console.log(
                        JSON.stringify(
                            parsedMail,
                            null,
                            2
                        )
                    );

                    await axios.post(
                        `${process.env.API_URL || "http://localhost:3000"}/api/new-email`,
                        parsedMail
                    );

                    // Save to DB here

                    callback();
                } catch (err) {
                    console.error(
                        "[PROCESS EMAIL ERROR]",
                        err
                    );

                    callback(err);
                }
            });
        } catch (err) {
            callback(err);
        }
    }
});

smtpServer.listen(SMTP_PORT, () => {
    console.log(
        `SMTP server listening on port ${SMTP_PORT}`
    );
});

smtpServer.on("error", err => {
    console.error(
        "[SMTP SERVER ERROR]",
        err
    );
});

process.on("uncaughtException", err => {
    console.error(
        "[UNCAUGHT EXCEPTION]",
        err
    );
});

process.on("unhandledRejection", err => {
    console.error(
        "[UNHANDLED REJECTION]",
        err
    );
});