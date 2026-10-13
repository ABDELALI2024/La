<?php
declare(strict_types=1);
// Shared helpers: JSON I/O, validation, CSRF, mail stub, audit. No framework needed.
function cfg(string $key, $default = null) {
  static $c = null;
  if ($c === null) {
    $paths = [
      dirname(__DIR__, 2) . '/langzio-private/config.php', // Hostinger: ~/langzio-private
      dirname(__DIR__) . '/config.php',                     // private/config.php (local/server fallback)
      dirname(__DIR__, 2) . '/private/config.php',
    ];
    $c = ['env' => 'production', 'url' => 'https://langzio.com'];
    foreach ($paths as $p) { if (is_file($p)) { $c = array_merge($c, require $p); break; } }
  }
  $parts = explode('.', $key); $v = $c;
  foreach ($parts as $k) { if (!is_array($v) || !array_key_exists($k, $v)) return $default; $v = $v[$k]; }
  return $v;
}

function json_body(): array {
  $raw = file_get_contents('php://input') ?: '';
  if ($raw === '') return [];
  if (strlen($raw) > 256 * 1024) json_error('Payload too large', 413);
  $d = json_decode($raw, true);
  if (!is_array($d)) json_error('Invalid JSON', 400);
  return $d;
}

function json_ok($data = [], int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function json_error(string $msg, int $code = 400, array $extra = []): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  echo json_encode(array_merge(['ok' => false, 'error' => $msg], $extra), JSON_UNESCAPED_UNICODE);
  exit;
}

function e(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

function valid_email(string $s): bool { return (bool)filter_var($s, FILTER_VALIDATE_EMAIL) && strlen($s) <= 255; }
function valid_password(string $s): bool { return strlen($s) >= 8 && strlen($s) <= 128; }

function client_ip(): string {
  return $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function csrf_token(): string {
  if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
  return $_SESSION['csrf'];
}
function csrf_check(): void {
  $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
  if ($m === 'GET' || $m === 'HEAD' || $m === 'OPTIONS') return;
  $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
  if (!$sent || empty($_SESSION['csrf']) || !hash_equals((string)$_SESSION['csrf'], (string)$sent))
    json_error('Invalid CSRF token', 419);
}

function audit(?int $actor, string $action, string $targetType = '', string $targetId = '', array $meta = []): void {
  try {
    $db = db();
    $st = $db->prepare('INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, ip, meta) VALUES (?,?,?,?,?,?)');
    $st->execute([$actor, $action, $targetType, (string)$targetId, client_ip(), json_encode($meta, JSON_UNESCAPED_UNICODE)]);
  } catch (Throwable $t) { /* never break request on audit failure */ }
}

/** Minimal mail sender: uses PHP mail(); on Hostinger configure SPF + SMTP mailbox. Returns bool. */
function send_mail(string $to, string $subject, string $html): bool {
  $from = (string)cfg('smtp.from', 'no-reply@langzio.com');
  $name = (string)cfg('smtp.from_name', 'Langzio');
  $headers = "MIME-Version: 1.0\r\nContent-type: text/html; charset=UTF-8\r\n"
    . 'From: ' . $name . ' <' . $from . ">\r\n"
    . 'Reply-To: ' . $from . "\r\nX-Mailer: Langzio/PHP\r\n";
  // Log to audit + attempt mail(); failure is non-fatal (user can resend).
  $sent = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $html, $headers);
  return (bool)$sent;
}

function require_method(array $allowed): void {
  $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
  if (!in_array($m, $allowed, true)) { header('Allow: ' . implode(', ', $allowed)); json_error('Method not allowed', 405); }
}

/** Very small router helper: match "METHOD /path" with :param segments. */
function route_match(string $pattern, string $method, string $path, array &$params = []): bool {
  [$pm, $pp] = explode(' ', $pattern, 2);
  if ($pm !== $method) return false;
  $pp = explode('/', trim($pp, '/')); $sp = explode('/', trim($path, '/'));
  if (count($pp) !== count($sp)) return false;
  $params = [];
  foreach ($pp as $i => $seg) {
    if (str_starts_with($seg, ':')) { $params[substr($seg, 1)] = urldecode($sp[$i]); continue; }
    if ($seg !== $sp[$i]) return false;
  }
  return true;
}
