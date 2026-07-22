# Password reset email (Resend)

## Why forgot-password said success but no email?

Until now the API only:
1. Created a reset token in DB
2. Returned success (and sometimes `resetToken` in Postman)

It did **not** send email because no mail provider was configured.

## Fix — use Resend

### 1) Create Resend account
1. Go to https://resend.com → Sign up  
2. **API Keys** → Create key → copy `re_...`  
3. (Optional later) Add your domain for production From-address  

### 2) Add to Render → Environment

```text
RESEND_API_KEY=re_xxxxxxxx
MAIL_FROM=Apex CRM <onboarding@resend.dev>
CLIENTZONE_RESET_URL=https://YOUR-CLIENTZONE-DOMAIN/resetpass
EXPOSE_RESET_TOKEN=true
```

Notes:
- Free Resend allows sending to **your own signup email** until you verify a domain.
- `onboarding@resend.dev` works for testing.
- For real clients, verify domain (e.g. `noreply@apexaiexperts.com`).

### 3) Local `.env` (optional)

Same variables as above.

### 4) Push + redeploy

Then Postman → Forgot password → check inbox (and spam).

Response will include:
```json
{ "data": { "emailSent": true } }
```

If `emailSent: false`, check Render logs for Resend errors.
