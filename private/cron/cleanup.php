<?php
declare(strict_types=1);
// Optional cron: cleanup expired tokens + old rate-limit rows + warn on quota.
// hPanel → Cron Jobs → Custom: /usr/bin/php /home/uXXXX/domains/langzio.com/langzio-private/cron/cleanup.php
// Frequency: daily. Not required for the app to function.
$lib = __DIR__ . '/../lib';
foreach (['Helpers.php','Db.php'] as $f) { if (is_file($lib . '/' . $f)) require_once $lib . '/' . $f; }
try {
  $db = db();
  $db->exec('DELETE FROM email_verifications WHERE used_at IS NOT NULL OR expires_at < NOW() - INTERVAL 7 DAY');
  $db->exec('DELETE FROM password_resets WHERE used_at IS NOT NULL OR expires_at < NOW() - INTERVAL 7 DAY');
  $db->exec('DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL 30 DAY');
  $db->exec("DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL 2 DAY");
  // Keep only last 200 messages per session to bound storage.
  $db->exec('DELETE m FROM conversation_messages m LEFT JOIN (SELECT session_id, id FROM (SELECT session_id, id, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY id DESC) rn FROM conversation_messages) t WHERE rn <= 200) k ON k.id = m.id WHERE k.id IS NULL');
  echo "cleanup ok " . date('c') . "\n";
} catch (Throwable $t) {
  error_log('[langzio][cron] ' . $t->getMessage());
  fwrite(STDERR, 'cleanup failed: ' . $t->getMessage() . "\n");
  exit(1);
}
