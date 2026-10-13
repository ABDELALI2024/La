<?php
declare(strict_types=1);
// Stripe integration structure (Checkout + webhooks). Inactive until keys are set.
// Morocco note: Stripe is not directly available for Moroccan-registered businesses
// (2026). This integration supports Stripe where the business is eligible, and the
// provider layer is isolated so CMI/PayPal can be added without touching the API.
// Until STRIPE_SECRET_KEY + webhook secret + price IDs are configured AND an
// end-to-end test succeeds, the app reports payments as "not live".

function billing_status(): array {
  $live = (string)cfg('stripe_secret', '') !== ''
       && (string)cfg('stripe_webhook_secret', '') !== ''
       && (string)cfg('stripe_prices.premium_monthly', '') !== '';
  return [
    'provider' => 'stripe',
    'live' => $live,
    'plans' => cfg('plans', []),
    'note' => $live ? 'Live' : 'Payments are not live yet: set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and price IDs in private/config.php, then run an end-to-end test.',
  ];
}

/** Create a Stripe Checkout Session via raw cURL (no SDK needed on shared hosting). */
function stripe_checkout(int $userId, string $email, string $plan): array {
  $secret = (string)cfg('stripe_secret', '');
  $prices = cfg('stripe_prices', []);
  if ($secret === '' || empty($prices[$plan] ?? '')) {
    return ['error' => 'Checkout is not configured yet.'];
  }
  $price = (string)$prices[$plan];
  $url = (string)cfg('url', 'https://langzio.com');
  $payload = http_build_query([
    'mode' => 'subscription',
    'customer_email' => $email,
    'line_items[0][price]' => $price,
    'line_items[0][quantity]' => 1,
    'success_url' => $url . '/subscription?status=success&session_id={CHECKOUT_SESSION_ID}',
    'cancel_url'  => $url . '/subscription?status=cancelled',
    'metadata[user_id]' => (string)$userId,
    'metadata[plan]' => $plan,
  ]);
  $ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
    CURLOPT_USERPWD => $secret . ':', CURLOPT_POSTFIELDS => $payload,
    CURLOPT_TIMEOUT => 25,
  ]);
  $raw = curl_exec($ch); $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  $d = json_decode((string)$raw, true);
  if ($http < 200 || $http >= 300 || empty($d['url'])) {
    error_log('[langzio][stripe] checkout failed http=' . $http . ' body=' . mb_substr((string)$raw, 0, 300));
    return ['error' => 'Could not start checkout. Please try again.'];
  }
  return ['url' => $d['url']];
}

/** Verify Stripe webhook signature (HMAC-SHA256, tolerant of multiple v1 signatures). */
function stripe_verify_signature(string $payload, string $sigHeader, string $secret): bool {
  // Header: t=1492774577,v1=abc,v1=def
  $parts = []; foreach (explode(',', $sigHeader) as $kv) { $p = explode('=', trim($kv), 2); if (count($p) === 2) $parts[$p[0]][] = $p[1]; }
  if (empty($parts['t'][0]) || empty($parts['v1'])) return false;
  $signed = $parts['t'][0] . '.' . $payload;
  $expected = hash_hmac('sha256', $signed, $secret);
  foreach ($parts['v1'] as $sig) { if (hash_equals($expected, $sig)) return true; }
  // 5-min tolerance
  if (abs(time() - (int)$parts['t'][0]) > 300) return false;
  return false;
}

/** Idempotent webhook processor:-event stored first, then applied once. */
function stripe_apply_event(array $event): void {
  $db = db();
  $eventId = (string)($event['id'] ?? '');
  $type = (string)($event['type'] ?? '');
  if ($eventId === '' || $type === '') return;
  $db->beginTransaction();
  try {
    $st = $db->prepare('INSERT IGNORE INTO payment_events (provider, event_id, type, payload) VALUES (?,?,?,?)');
    $st->execute(['stripe', $eventId, $type, json_encode($event, JSON_UNESCAPED_UNICODE)]);
    if ($st->rowCount() === 0) { $db->commit(); return; } // duplicate delivery → idempotent skip
    $obj = $event['data']['object'] ?? [];
    $customer = (string)($obj['customer'] ?? '');
    $subId = (string)($obj['id'] ?? ($obj['subscription'] ?? ''));
    $metaUid = (int)($obj['metadata']['user_id'] ?? 0);
    if ($metaUid <= 0 && $customer !== '') {
      $st = $db->prepare('SELECT user_id FROM subscriptions WHERE provider_customer_id = ? LIMIT 1');
      $st->execute([$customer]);
      $metaUid = (int)($st->fetchColumn() ?: 0);
    }
    switch ($type) {
      case 'checkout.session.completed': {
        $plan = ($obj['metadata']['plan'] ?? 'premium_monthly') === 'premium_yearly' ? 'premium_yearly' : 'premium_monthly';
        if ($metaUid > 0) {
          $st = $db->prepare("INSERT INTO subscriptions (user_id, provider, provider_customer_id, provider_sub_id, status, plan)
                              VALUES (?,?,?,?, 'active', ?) ON DUPLICATE KEY UPDATE status='active', plan=VALUES(plan), provider_customer_id=VALUES(provider_customer_id)");
          // NOTE: provider_sub_id unique; checkout may not know sub id yet → store session id, updated on invoice/sub events.
          $st->execute([$metaUid, 'stripe', $customer, (string)($obj['subscription'] ?? $obj['id'] ?? ''), $plan]);
          $st = $db->prepare("UPDATE users SET plan='premium' WHERE id=?");
          $st->execute([$metaUid]);
          $st = $db->prepare('UPDATE payment_events SET user_id=?, processed_at=NOW() WHERE provider=? AND event_id=?');
          $st->execute([$metaUid, 'stripe', $eventId]);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        $status = $type === 'customer.subscription.deleted' ? 'canceled' : (string)($obj['status'] ?? 'past_due');
        $allowed = ['active','trialing','past_due','canceled','incomplete','unpaid'];
        if (!in_array($status, $allowed, true)) $status = 'past_due';
        if ($subId !== '') {
          $st = $db->prepare('UPDATE subscriptions SET status=? WHERE provider=? AND provider_sub_id=?');
          $st->execute([$status, 'stripe', $subId]);
          $st = $db->prepare('SELECT user_id FROM subscriptions WHERE provider=? AND provider_sub_id=? LIMIT 1');
          $st->execute(['stripe', $subId]);
          $uid = (int)($st->fetchColumn() ?: 0);
          if ($uid > 0) {
            // Recompute entitlement: any active/trialing sub left?
            $st = $db->prepare("SELECT 1 FROM subscriptions WHERE user_id=? AND status IN ('active','trialing') LIMIT 1");
            $st->execute([$uid]);
            $premium = (bool)$st->fetchColumn();
            $st = $db->prepare('UPDATE users SET plan=? WHERE id=?');
            $st->execute([$premium ? 'premium' : 'free', $uid]);
            $st = $db->prepare('UPDATE payment_events SET user_id=?, processed_at=NOW() WHERE provider=? AND event_id=?');
            $st->execute([$uid, 'stripe', $eventId]);
          } else {
            $st = $db->prepare('UPDATE payment_events SET processed_at=NOW() WHERE provider=? AND event_id=?');
            $st->execute(['stripe', $eventId]);
          }
        }
        break;
      }
      default: {
        $st = $db->prepare('UPDATE payment_events SET processed_at=NOW(), user_id=? WHERE provider=? AND event_id=?');
        $st->execute([$metaUid > 0 ? $metaUid : null, 'stripe', $eventId]);
      }
    }
    $db->commit();
  } catch (Throwable $t) {
    if ($db->inTransaction()) $db->rollBack();
    error_log('[langzio][stripe] apply failed: ' . $t->getMessage());
    throw $t;
  }
}
