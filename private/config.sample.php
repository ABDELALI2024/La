<?php
// LANGZIO private config template. Copy to private/config.php (OUTSIDE public_html)
// on Hostinger: ~/langzio-private/config.php with chmod 600. Never commit real values.
return [
  'env'      => getenv('APP_ENV') ?: 'production',
  'url'      => 'https://langzio.com',
  'app_key'  => 'CHANGE-ME-32-BYTES-MIN',
  'db' => [
    'host'    => 'localhost',
    'name'    => 'langzio',
    'user'    => 'langzio_user',
    'pass'    => 'CHANGE-ME',
    'charset' => 'utf8mb4',
  ],
  'session_name'  => 'LANGZIOSESSID',
  'cookie_secure' => true,   // true on https://langzio.com
  'gemini_api_key' => '',
  'gemini_model'   => 'gemini-2.0-flash',
  'ai_daily_free'    => 20,
  'ai_daily_premium' => 200,
  'stripe_secret'   => '',
  'stripe_webhook_secret' => '',
  'stripe_prices' => [
    'premium_monthly' => '',
    'premium_yearly'  => '',
  ],
  // Configurable plans (no hardcoded pricing in code paths; UI reads these)
  'plans' => [
    'free' => ['name' => 'Free', 'price' => 0, 'currency' => 'USD',
               'features' => ['12 starter lessons', '20 AI messages/day', 'Vocabulary trainer']],
    'premium' => ['name' => 'Premium', 'price' => null, 'currency' => 'USD',
               'features' => ['All lessons A0–B2', '200 AI messages/day', 'Roleplays & correction mode', 'Progress & SRS mastery'],
               'note' => 'Set price in config + Stripe dashboard to activate checkout.'],
  ],
  'smtp' => [
    'host' => 'smtp.hostinger.com', 'port' => 587,
    'user' => 'no-reply@langzio.com', 'pass' => '',
    'from' => 'no-reply@langzio.com', 'from_name' => 'Langzio',
  ],
];
