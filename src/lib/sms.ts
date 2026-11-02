// SMS sending. No provider is wired up yet: messages are printed to the server log.
// To go live, replace the body of sendSms with a call to your SMS gateway
// (e.g. Zamtel Bulk SMS, Africa's Talking, Twilio) using SMS_* settings from .env.

export async function sendSms(phone: string, text: string): Promise<void> {
  if (process.env.SMS_PROVIDER) {
    // TODO: call the configured provider here.
  }
  console.log(`[sms] to ${phone}: ${text}`);
}
