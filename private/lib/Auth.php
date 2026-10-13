<?php
declare(strict_types=1);
// Sessions + current user + guards. Call boot_session() once per API request.
function boot_session(): void {
  if (session_status() === PHP_SESSION_ACTIVE) return;
  $name = (string)cfg('session_name', 'LANGZIOSESSID');
  session_name($name);
  $secure = filter_var(cfg('cookie_secure', true), FILTER_VALIDATE_BOOLEAN);
  session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 14,           // 14 days
    'path' => '/',
    'domain' => '',
    'secure' => $secure,                        // true on https://langzio.com
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  session_start();
  // Idle timeout 12h
  if (isset($_SESSION['last_seen']) && time() - (int)$_SESSION['last_seen'] > 43200) {
    session_unset(); session_destroy(); session_start();
  }
  $_SESSION['last_seen'] = time();
}

function current_user(): ?array {
  if (empty($_SESSION['uid'])) return null;
  try {
    $st = db()->prepare('SELECT id, email, display_name, is_verified, is_active, is_admin, plan FROM users WHERE id = ? LIMIT 1');
    $st->execute([(int)$_SESSION['uid']]);
    $u = $st->fetch();
    if (!$u || !(int)$u['is_active']) { unset($_SESSION['uid']); return null; }
    return $u;
  } catch (Throwable $t) { return null; }
}

function require_auth(): array {
  $u = current_user();
  if (!$u) json_error('Authentication required', 401);
  return $u;
}

function require_admin(): array {
  $u = require_auth();
  $admin = (int)($u['is_admin'] ?? 0) === 1;
  if (!$admin) {
    try {
      $st = db()->prepare('SELECT 1 FROM admin_roles WHERE user_id = ? LIMIT 1');
      $st->execute([(int)$u['id']]);
      $admin = (bool)$st->fetchColumn();
    } catch (Throwable $t) { $admin = false; }
  }
  if (!$admin) json_error('Admin access required', 403);
  return $u;
}

function login_user(array $user): void {
  session_regenerate_id(true);
  $_SESSION['uid'] = (int)$user['id'];
  $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function logout_user(): void {
  $_SESSION = [];
  if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', ['expires' => time() - 42000, 'path' => $p['path'], 'domain' => $p['domain'], 'secure' => $p['secure'], 'httponly' => $p['httponly'], 'samesite' => $p['samesite'] ?? 'Lax']);
  }
  session_destroy();
}

/** Server-side entitlement: never trust the frontend. Premium = users.plan OR active subscription row. */
function is_premium(int $userId): bool {
  try {
    $db = db();
    $st = $db->prepare('SELECT plan FROM users WHERE id = ? LIMIT 1');
    $st->execute([$userId]);
    if ($st->fetchColumn() === 'premium') return true;
    $st = $db->prepare("SELECT 1 FROM subscriptions WHERE user_id = ? AND status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > NOW()) LIMIT 1");
    $st->execute([$userId]);
    return (bool)$st->fetchColumn();
  } catch (Throwable $t) { return false; }
}

/** AI daily quota: free 20 / premium 200 (configurable). Returns [used, limit]. */
function ai_quota(int $userId): array {
  $limit = is_premium($userId) ? (int)cfg('ai_daily_premium', 200) : (int)cfg('ai_daily_free', 20);
  try {
    $st = db()->prepare("SELECT COALESCE(SUM(units),0) FROM usage_records WHERE user_id = ? AND kind = 'ai_message' AND created_at >= CURDATE()");
    $st->execute([$userId]);
    $used = (int)$st->fetchColumn();
  } catch (Throwable $t) { $used = 0; }
  return [$used, $limit];
}
