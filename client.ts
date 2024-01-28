import { GaxiosResponse } from "gaxios";
import { gmail_v1 } from "googleapis";

import { getLatestEmail, gmailClient } from "./gmail";
import { generateTestEmail } from "./addressCalculator"

export class EmailClient {
  private gmail: gmail_v1.Gmail
  private user: GaxiosResponse<gmail_v1.Schema$Profile>
  private emailAddress: string;

  public email: string;

  async ready() {
    this.gmail = await gmailClient()
    this.user = await this.gmail.users.getProfile({ userId: 'me' })
    if (!this.user.data.emailAddress) throw new Error("No email address found")
    this.emailAddress = this.user.data.emailAddress
    this.email = generateTestEmail(this.emailAddress)
  }

  async getLatestEmail(expectedCount: number = 1) {
    const data = await getLatestEmail(this.gmail, this.email, expectedCount)
    const parts = data?.payload?.parts
    if (!parts) throw new Error("No parts found")
    const emailData = parts[1]?.body?.data;
    if (!emailData) throw new Error("No email data found")

    const body = Buffer.from(emailData, 'base64').toString('utf8')
    // console.log({ body })
    return body
  }

  async getLatestEmailText(expectedCount: number = 1) {
    const data = await getLatestEmail(this.gmail, this.email, expectedCount)
    const parts = data?.payload?.parts
    if (!parts) throw new Error("No parts found")
    const emailData = parts[0]?.body?.data;
    if (!emailData) throw new Error("No email data found")

    const body = Buffer.from(emailData, 'base64').toString('utf8')
    // console.log({ body })
    return body
  }
}
