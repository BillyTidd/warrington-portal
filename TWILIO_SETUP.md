# Twilio Setup Guide

## 1. Create a Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up with your email address
3. Verify your email and phone number
4. Complete the onboarding (select "SMS" and "WhatsApp" as your use cases)

---

## 2. Get Your Account SID & Auth Token

1. Log in to the Twilio Console: https://console.twilio.com
2. On the dashboard homepage you will see:
   - **Account SID** — starts with `AC...`
   - **Auth Token** — click the eye icon to reveal it

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
```

---

## 3. Get a Phone Number for SMS

1. In the Twilio Console, go to **Phone Numbers → Manage → Buy a Number**
2. Filter by country: **United Kingdom** (or your preferred country)
3. Make sure the number has **SMS** capability checked
4. Click **Buy** (costs ~$1/month on paid plan, free trial includes credit)
5. Copy the number in E.164 format e.g. `+441234567890`

```env
TWILIO_PHONE_NUMBER=+441234567890
```

> **Free Trial Note:** On a free trial account, you can only send SMS to verified numbers.
> Go to **Phone Numbers → Verified Caller IDs** to add test numbers.

---

## 4. Set Up WhatsApp

Twilio offers two options for WhatsApp:

### Option A — Sandbox (for testing, no approval needed)

1. In the Twilio Console, go to **Messaging → Try it out → Send a WhatsApp message**
2. You will see a sandbox number, e.g. `+14155238886`
3. Each worker who needs to receive test messages must first **join your sandbox** by sending:
   ```
   join <your-sandbox-keyword>
   ```
   to `+14155238886` on WhatsApp (Twilio shows you the exact keyword)
4. Use the sandbox number as your WhatsApp sender:

```env
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### Option B — Production WhatsApp Business API (requires approval)

1. Go to **Messaging → Senders → WhatsApp Senders**
2. Click **Request Access**
3. Fill in your business details (Facebook Business Manager ID required)
4. Twilio submits the request to Meta — approval takes **2–5 business days**
5. Once approved, you get a dedicated WhatsApp number
6. Use that number as:

```env
TWILIO_WHATSAPP_NUMBER=+447xxxxxxxxx
```

> For production use Option B. Workers will receive messages without needing to join a sandbox.

---

## 5. Final .env.local Values

Add all four variables to your `.env.local`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+441234567890
TWILIO_WHATSAPP_NUMBER=+14155238886
```

---

## 6. Test It

### Test SMS
1. Make sure you have at least one employee in the system with a UK phone number set
2. Open any approved job → **Confirmations** tab
3. Select that employee, choose **SMS**, click **Send**
4. The worker receives an SMS with a link to `/confirm/[token]`

### Test WhatsApp (Sandbox)
1. The worker's phone must have joined your sandbox first (see Step 4A)
2. Select the same employee, choose **WhatsApp**, click **Send**
3. Worker receives a WhatsApp message with the confirmation link

---

## 7. Upgrade from Trial to Paid

Trial accounts have restrictions (verified numbers only, "Sent from your Twilio trial account" prefix on messages).

To remove restrictions:
1. Go to **Billing → Upgrade Account**
2. Add a payment method
3. Messages will now go to any number without restrictions

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Twilio credentials not configured` | Env vars missing | Check `.env.local` has all 4 vars |
| `The number +44xxx is unverified` | Trial account restriction | Verify the number or upgrade account |
| `63016 - Channel not available` | Worker hasn't joined WhatsApp sandbox | Ask worker to send the join keyword first |
| `21608 - The 'To' number is not a valid phone number` | Number not in E.164 format | Ensure number stored as `+447xxxxxxxxx` |
| `Message not delivered` | Wrong WhatsApp sender format | Must be `whatsapp:+14155238886` — handled automatically |
