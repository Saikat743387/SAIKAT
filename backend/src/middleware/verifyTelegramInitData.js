import crypto from "crypto";

/**
 * Verifies Telegram Mini App `initData` per Telegram's official algorithm:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * secret_key = HMAC_SHA256("WebAppData", bot_token)
 * check_hash = HEX( HMAC_SHA256(secret_key, data_check_string) )
 *
 * data_check_string = all fields except `hash`, sorted alphabetically by key,
 * joined as "key=value" with "\n".
 *
 * Returns the parsed user object if valid, otherwise throws.
 */
export function verifyInitData(initData, botToken) {
  if (!initData || typeof initData !== "string") {
    const err = new Error("initData is required");
    err.status = 400;
    throw err;
  }
  if (!botToken) {
    const err = new Error("TELEGRAM_BOT_TOKEN is not configured on the server");
    err.status = 500;
    throw err;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    const err = new Error("initData missing hash");
    err.status = 400;
    throw err;
  }
  params.delete("hash");

  const dataCheckArr = [];
  for (const [key, value] of params.entries()) {
    dataCheckArr.push(`${key}=${value}`);
  }
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) {
    const err = new Error("Invalid Telegram initData signature");
    err.status = 400;
    throw err;
  }

  const authDate = Number(params.get("auth_date"));
  const maxAge = Number(process.env.INITDATA_MAX_AGE_SECONDS || 86400);
  if (!authDate || Date.now() / 1000 - authDate > maxAge) {
    const err = new Error("Telegram initData has expired, please reopen the app");
    err.status = 400;
    throw err;
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    const err = new Error("initData missing user field");
    err.status = 400;
    throw err;
  }

  const user = JSON.parse(userRaw);
  const startParam = params.get("start_param") || null; // used for referral codes

  return { user, startParam, authDate };
}
