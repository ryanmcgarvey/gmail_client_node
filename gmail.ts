const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
import { gmail_v1, google } from "googleapis";
import { pollWithTimeout } from "../pollWithTimeout";

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
export async function authorize() {
  let client = await loadSavedCredentialsIfExist();

  if (client) {
    return client;
  }

  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (!client) {
    throw new Error('Failed to authenticate');
  }

  if (client.credentials) {
    await saveCredentials(client);
  }

  return client;
}

export async function gmailClient() {
  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth, timeout: 10000, });
  return gmail;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
export async function listLabels(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.labels.list({
    userId: 'me',
  });
  const labels = res.data.labels;
  if (!labels || labels.length === 0) {
    console.log('No labels found.');
    return;
  }
  console.log('Labels:');
  labels.forEach((label) => {
    console.log(`- ${label.name}`);
  });
}

export async function getLatestEmail(gmail: gmail_v1.Gmail, email: string, expectedCount: number = 1) {
  const res = await pollWithTimeout(async () => {
    const res = await gmail.users.messages.list({ userId: 'me', q: `to:${email}` })


    if (!res.data.messages || res.data.messages.length < expectedCount) {
      // console.log("Still waiting for emails: " + res.data.messages?.length + " < " + expectedCount)
      return null;
    }
    return res;

  }, 10000, 1000)

  if (!res?.data.messages || res?.data.messages.length === 0) {
    throw new Error("No messages found")
  }

  const messages = res.data.messages;
  const message = messages[0]
  const messageId = message.id
  if (!messageId) throw new Error("No message ID found")

  const messageRes = await gmail.users.messages.get({ userId: 'me', id: messageId })

  return messageRes.data;
}

// authorize().then(listLabels).catch(console.error);