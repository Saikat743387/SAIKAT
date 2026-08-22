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
    throw new Error("initData is required");
  }
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured on the server");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("initData missing hash");
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
    throw new Error("Invalid Telegram initData signature");
  }

  const authDate = Number(params.get("auth_date"));
  const maxAge = Number(process.env.INITDATA_MAX_AGE_SECONDS || 86400);
  if (!authDate || Date.now() / 1000 - authDate > maxAge) {
    throw new Error("Telegram initData has expired, please reopen the app");
  }

  const userRaw = params.get("user");
  if (!userRaw) throw new Error("initData missing user field");

  const user = JSON.parse(userRaw);
  const startParam = params.get("start_param") || null; // used for referral codes

  return { user, startParam, authDate };
}
