const { v4: uuidv4 } = require("uuid");

export function generateTestEmail(emailAddress) {
  const [emailName, emailDomain] = emailAddress.split("@")
  return `${emailName}+smoke-test-${uuidv4()}@${emailDomain}`
}