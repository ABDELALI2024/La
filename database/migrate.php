<?php
declare(strict_types=1);
// CLI + web-safe migration runner. Applies database/*.sql in filename order.
// Usage (SSH): php database/migrate.php
// Usage (one-time via browser, then DELETE the allow flag): /api/health?migrate=1 is NOT provided — run via phpMyAdmin import instead on shared hosting.
// Tracks applied files in `migrations` table.
error_reporting(E_ALL & ~E_DEPRECATED);
$root = dirname(__DIR__);
$privCandidates = [$root . '/private/config.php', dirname($root) . '/langzio-private/config.php'];
$cfg = ['db' => ['host' => 'localhost', 'name' => 'langzio', 'user' => '', 'pass' => '', 'charset' => 'utf8mb4']];
foreach ($privCandidates as $p) { if (is_file($p)) { $c = require $p; if (is_array($c)) $cfg = array_merge($cfg, $c); break; } }
foreach (['DB_HOST','DB_NAME','DB_USER','DB_PASS'] as $k) { $v = getenv($k); if ($v !== false && $v !== '') { /* env override */ } }
$envMap = ['DB_HOST' => ['db','host'], 'DB_NAME' => ['db','name'], 'DB_USER' => ['db','user'], 'DB_PASS' => ['db','pass']];
foreach ($envMap as $env => $path) { $v = getenv($env); if ($v !== false && $v !== '') $cfg[$path[0]][$path[1]] = $v; }

try {
  $pdo = new PDO(
    'mysql:host=' . $cfg['db']['host'] . ';charset=' . ($cfg['db']['charset'] ?? 'utf8mb4'),
    $cfg['db']['user'], $cfg['db']['pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );
  $pdo->exec('CREATE DATABASE IF NOT EXISTS `' . str_replace('`','',$cfg['db']['name']) . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  $pdo->exec('USE `' . str_replace('`','',$cfg['db']['name']) . '`');
  $pdo->exec("CREATE TABLE IF NOT EXISTS `migrations` (`id` INT UNSIGNED NOT NULL AUTO_INCREMENT, `filename` VARCHAR(255) NOT NULL, `applied_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`), UNIQUE KEY `uq_migrations_filename` (`filename`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $done = $pdo->query('SELECT filename FROM migrations')->fetchAll(PDO::FETCH_COLUMN);
  $done = array_flip((array)$done);
  $files = glob($root . '/database/*.sql') ?: [];
  sort($files);
  foreach ($files as $f) {
    $base = basename($f);
    if (isset($done[$base])) { echo "SKIP $base\n"; continue; }
    echo "APPLY $base ... ";
    $sql = file_get_contents($f);
    // Strip USE statement (we already selected DB) to allow restricted users.
    $sql = preg_replace('/^\s*USE\s+`?\w+`?\s*;/mi', '', $sql);
    $pdo->exec('SET NAMES utf8mb4');
    // Execute whole file; MySQL PDO does not allow multi-statements via exec reliably for large files,
    // so split on semicolon-newline boundaries outside of procedures (no procedures in our files).
    $stmts = preg_split('/;\s*\n/', $sql);
    foreach ($stmts as $s) { $s = trim($s); if ($s === '' || str_starts_with($s, '--') && strlen(trim($s)) < 5) continue; if ($s !== '') $pdo->exec($s); }
    $st = $pdo->prepare('INSERT INTO migrations (filename) VALUES (?)');
    $st->execute([$base]);
    echo "OK\n";
  }
  echo "Migrations complete.\n";
} catch (Throwable $t) {
  fwrite(STDERR, 'MIGRATION FAILED: ' . $t->getMessage() . "\n");
  exit(1);
}
