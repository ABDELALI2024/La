<?php
declare(strict_types=1);
// PDO singleton. Uses private/config.php (outside public_html).
function db(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;
  $db = cfg('db', []);
  $host = $db['host'] ?? 'localhost';
  $name = $db['name'] ?? 'langzio';
  $user = $db['user'] ?? '';
  $pass = $db['pass'] ?? '';
  $charset = $db['charset'] ?? 'utf8mb4';
  $dsn = "mysql:host={$host};dbname={$name};charset={$charset}";
  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ]);
  return $pdo;
}
