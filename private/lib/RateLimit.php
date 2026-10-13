<?php
declare(strict_types=1);
// DB-backed rate limiting (works on shared hosting, no Redis needed).
function rate_limit_check(string $key, int $max, int $windowSec): bool {
  // Returns true if allowed. Key examples: "login:1.2.3.4", "ai:42".
  try {
    $db = db();
    $db->exec("CREATE TABLE IF NOT EXISTS `rate_limits` (
      `k` VARCHAR(128) NOT NULL, `window_start` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      `hits` INT NOT NULL DEFAULT 1, PRIMARY KEY (`k`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $db->beginTransaction();
    $st = $db->prepare('SELECT hits, window_start FROM rate_limits WHERE k = ? FOR UPDATE');
    $st->execute([$key]);
    $row = $st->fetch();
    $now = time();
    if (!$row) {
      $st = $db->prepare('INSERT INTO rate_limits (k, hits) VALUES (?,1)');
      $st->execute([$key]);
      $db->commit();
      return true;
    }
    $start = strtotime((string)$row['window_start']);
    if ($now - $start >= $windowSec) {
      $st = $db->prepare('UPDATE rate_limits SET hits = 1, window_start = NOW() WHERE k = ?');
      $st->execute([$key]);
      $db->commit();
      return true;
    }
    if ((int)$row['hits'] >= $max) { $db->rollBack(); return false; }
    $st = $db->prepare('UPDATE rate_limits SET hits = hits + 1 WHERE k = ?');
    $st->execute([$key]);
    $db->commit();
    return true;
  } catch (Throwable $t) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    return true; // fail open for availability; auth brute-force still logged in login_attempts
  }
}

/** Login brute-force guard: max 10 fails / 10 min per IP, 10 per email. */
function login_allowed(string $ip, string $email): bool {
  try {
    $db = db();
    $st = $db->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND success = 0 AND attempted_at > (NOW() - INTERVAL 10 MINUTE)');
    $st->execute([$ip]);
    if ((int)$st->fetchColumn() >= 10) return false;
    $st = $db->prepare('SELECT COUNT(*) FROM login_attempts WHERE email = ? AND success = 0 AND attempted_at > (NOW() - INTERVAL 10 MINUTE)');
    $st->execute([$email]);
    return (int)$st->fetchColumn() < 10;
  } catch (Throwable $t) { return true; }
}

function login_record(string $ip, string $email, bool $success): void {
  try {
    $st = db()->prepare('INSERT INTO login_attempts (ip, email, success) VALUES (?,?,?)');
    $st->execute([$ip, $email, $success ? 1 : 0]);
  } catch (Throwable $t) {}
}
