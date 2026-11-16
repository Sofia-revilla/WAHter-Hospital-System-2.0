import { Injectable } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";

// Sends the access key for the paper's Access Key Verification step. Locally
// it goes to Mailpit (http://localhost:8025), a fake inbox that catches every
// message; nothing leaves the machine. A real deployment points SMTP_HOST at
// the hospital's mail server.

@Injectable()
export class Mailer {
  private readonly transport: Transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "mailpit",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    // Mailpit has no TLS; a real mail server would
    ignoreTLS: !process.env.SMTP_HOST,
  });

  async sendAccessKey(to: string, name: string, code: string, minutesValid: number) {
    await this.transport.sendMail({
      from: process.env.SMTP_FROM ?? "WAHter <no-reply@wahter.local>",
      to,
      subject: `WAHter access key: ${code}`,
      text:
        `Hi ${name},\n\n` +
        `Your WAHter access key is ${code}. It works once and expires in ${minutesValid} minutes.\n\n` +
        "If you didn't just sign in, tell your System Administrator.\n",
    });
  }
}
