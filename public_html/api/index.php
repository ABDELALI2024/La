<?php
declare(strict_types=1);
// LANGZIO API router — plain PHP 8.2, zero dependencies. Deploy to public_html/api/index.php
// .htaccess rewrites /api/* here. Private lib lives OUTSIDE public_html (~/langzio-private)
// with fallback to ../../private for local/staging layouts.

error_reporting(E_ALL);
ini_set('display_errors', '0'); // never leak internals; errors go to Hostinger error log
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

$boot = __DIR__ . '/../../private_bootstrap.php';
$libDir = null;
foreach ([dirname(__DIR__, 3) . '/langzio-private/lib', dirname(__DIR__, 2) . '/private/lib', dirname(__DIR__) . '/../private/lib'] as $d) {
  if (is_dir($d)) { $libDir = $d; break; }
}
if ($libDir === null) { http_response_code(500); header('Content-Type: application/json'); echo json_encode(['ok'=>false,'error'=>'Server misconfigured']); exit; }
require_once $libDir . '/Helpers.php';
require_once $libDir . '/Db.php';
require_once $libDir . '/Auth.php';
require_once $libDir . '/RateLimit.php';
require_once $libDir . '/Gemini.php';
require_once $libDir . '/Billing.php';

set_exception_handler(function (Throwable $t) {
  error_log('[langzio][api] ' . $t->getMessage() . ' @ ' . $t->getFile() . ':' . $t->getLine());
  json_error('Something went wrong. Please try again.', 500);
});

boot_session();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') { http_response_code(204); exit; }

// Resolve route: /api/<route> via ?route= (htaccess) or PATH_INFO
$route = (string)($_GET['route'] ?? '');
if ($route === '') {
  $pi = (string)($_SERVER['PATH_INFO'] ?? '');
  $route = trim($pi, '/');
  if (str_starts_with($route, 'api/')) $route = substr($route, 4);
}
$route = trim($route, '/');
$path = '/' . $route;
$params = [];

// ---- Public: health, csrf, config -------------------------------------------
if (route_match('GET /health', $method, $path)) {
  try { db()->query('SELECT 1'); $dbOk = true; } catch (Throwable $t) { $dbOk = false; }
  json_ok(['status' => 'ok', 'db' => $dbOk, 'time' => gmdate('c'), 'ai_configured' => (string)cfg('gemini_api_key','') !== '']);
}
if (route_match('GET /csrf', $method, $path)) json_ok(['token' => csrf_token()]);
if (route_match('GET /config', $method, $path)) json_ok(billing_status());

// ---- Auth --------------------------------------------------------------------
if (route_match('POST /auth/register', $method, $path)) {
  csrf_check();
  if (!rate_limit_check('reg:' . client_ip(), 10, 3600)) json_error('Too many attempts. Try later.', 429);
  $b = json_body();
  $email = strtolower(trim((string)($b['email'] ?? '')));
  $pass = (string)($b['password'] ?? '');
  $name = trim(mb_substr((string)($b['name'] ?? ''), 0, 120));
  if (!valid_email($email)) json_error('Enter a valid email address.', 422);
  if (!valid_password($pass)) json_error('Password must be at least 8 characters.', 422);
  if ($name === '') $name = explode('@', $email)[0];
  $db = db();
  $st = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
  $st->execute([$email]);
  if ($st->fetch()) json_error('An account with this email already exists.', 409);
  $db->beginTransaction();
  try {
    $st = $db->prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?,?,?)');
    $st->execute([$email, password_hash($pass, PASSWORD_DEFAULT), $name]);
    $uid = (int)$db->lastInsertId();
    $st = $db->prepare('INSERT INTO user_preferences (user_id) VALUES (?)');
    $st->execute([$uid]);
    $token = bin2hex(random_bytes(32));
    $st = $db->prepare('INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES (?,?, DATE_ADD(NOW(), INTERVAL 24 HOUR))');
    $st->execute([$uid, hash('sha256', $token), ]);
    $db->commit();
  } catch (Throwable $t) { $db->rollBack(); throw $t; }
  $url = rtrim((string)cfg('url', 'https://langzio.com'), '/');
  @send_mail($email, 'Verify your Langzio account',
    '<p>Hello ' . e($name) . ',</p><p>Verify your email:</p><p><a href="' . e($url . '/login?verify=' . $token) . '">Verify my account</a></p><p>This link expires in 24 hours.</p>');
  audit($uid, 'user.register');
  // Auto-login (unverified but active); gating of premium features does not depend on verification.
  login_user(['id' => $uid]);
  json_ok(['user' => ['id' => $uid, 'email' => $email, 'name' => $name, 'verified' => false], 'csrf' => csrf_token()], 201);
}

if (route_match('POST /auth/login', $method, $path)) {
  csrf_check();
  $b = json_body();
  $email = strtolower(trim((string)($b['email'] ?? '')));
  $pass = (string)($b['password'] ?? '');
  $ip = client_ip();
  if (!valid_email($email) || $pass === '') json_error('Enter your email and password.', 422);
  if (!login_allowed($ip, $email)) json_error('Too many failed attempts. Wait 10 minutes.', 429);
  $st = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
  $st->execute([$email]);
  $u = $st->fetch();
  if (!$u || !(int)$u['is_active'] || !password_verify($pass, (string)$u['password_hash'])) {
    login_record($ip, $email, false);
    json_error('Incorrect email or password.', 401);
  }
  login_record($ip, $email, true);
  $st = db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?');
  $st->execute([(int)$u['id']]);
  try {
    $st = db()->prepare("INSERT INTO user_activity (user_id, kind) VALUES (?,'login')");
    $st->execute([(int)$u['id']]);
  } catch (Throwable $t) {}
  audit((int)$u['id'], 'user.login');
  login_user($u);
  json_ok(['user' => ['id' => (int)$u['id'], 'email' => $u['email'], 'name' => $u['display_name'], 'verified' => (bool)$u['is_verified'], 'admin' => (int)$u['is_admin'] === 1, 'plan' => is_premium((int)$u['id']) ? 'premium' : 'free'], 'csrf' => csrf_token()]);
}

if (route_match('POST /auth/logout', $method, $path)) {
  csrf_check();
  $u = current_user();
  if ($u) audit((int)$u['id'], 'user.logout');
  logout_user();
  json_ok(['done' => true]);
}

if (route_match('GET /auth/me', $method, $path)) {
  $u = current_user();
  if (!$u) json_ok(['user' => null]);
  json_ok(['user' => ['id' => (int)$u['id'], 'email' => $u['email'], 'name' => $u['display_name'], 'verified' => (bool)$u['is_verified'], 'admin' => (int)$u['is_admin'] === 1, 'plan' => is_premium((int)$u['id']) ? 'premium' : 'free']]);
}

if (route_match('POST /auth/verify', $method, $path) || route_match('GET /auth/verify', $method, $path)) {
  $token = $method === 'GET' ? (string)($_GET['token'] ?? '') : (string)(json_body()['token'] ?? ($_GET['token'] ?? ''));
  if ($token === '' || strlen($token) > 128) json_error('Invalid token.', 422);
  $db = db();
  $st = $db->prepare('SELECT id, user_id, expires_at, used_at FROM email_verifications WHERE token_hash = ? LIMIT 1');
  $st->execute([hash('sha256', $token)]);
  $row = $st->fetch();
  if (!$row || $row['used_at'] !== null || strtotime((string)$row['expires_at']) < time()) json_error('This link is invalid or expired.', 400);
  $db->beginTransaction();
  try {
    $st = $db->prepare('UPDATE email_verifications SET used_at = NOW() WHERE id = ?');
    $st->execute([(int)$row['id']]);
    $st = $db->prepare('UPDATE users SET is_verified = 1 WHERE id = ?');
    $st->execute([(int)$row['user_id']]);
    $db->commit();
  } catch (Throwable $t) { $db->rollBack(); throw $t; }
  audit((int)$row['user_id'], 'user.verify');
  json_ok(['verified' => true]);
}

if (route_match('POST /auth/forgot', $method, $path)) {
  csrf_check();
  if (!rate_limit_check('forgot:' . client_ip(), 5, 3600)) json_error('Too many attempts. Try later.', 429);
  $b = json_body();
  $email = strtolower(trim((string)($b['email'] ?? '')));
  // Always return ok to avoid account enumeration.
  if (valid_email($email)) {
    $st = db()->prepare('SELECT id, display_name FROM users WHERE email = ? LIMIT 1');
    $st->execute([$email]);
    if ($row = $st->fetch()) {
      $token = bin2hex(random_bytes(32));
      $st = db()->prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?,?, DATE_ADD(NOW(), INTERVAL 1 HOUR))');
      $st->execute([(int)$row['id'], hash('sha256', $token)]);
      $url = rtrim((string)cfg('url', 'https://langzio.com'), '/');
      @send_mail($email, 'Reset your Langzio password',
        '<p>Hello ' . e((string)$row['display_name']) . ',</p><p><a href="' . e($url . '/login?reset=' . $token) . '">Reset your password</a> (expires in 1 hour).</p><p>If you did not request this, ignore this email.</p>');
      audit((int)$row['id'], 'user.forgot');
    }
  }
  json_ok(['sent' => true]);
}

if (route_match('POST /auth/reset', $method, $path)) {
  csrf_check();
  $b = json_body();
  $token = (string)($b['token'] ?? '');
  $pass = (string)($b['password'] ?? '');
  if (!valid_password($pass)) json_error('Password must be at least 8 characters.', 422);
  $st = db()->prepare('SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ? LIMIT 1');
  $st->execute([hash('sha256', $token)]);
  $row = $st->fetch();
  if (!$row || $row['used_at'] !== null || strtotime((string)$row['expires_at']) < time()) json_error('This link is invalid or expired.', 400);
  $db = db(); $db->beginTransaction();
  try {
    $st = $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $st->execute([password_hash($pass, PASSWORD_DEFAULT), (int)$row['user_id']]);
    $st = $db->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = ?');
    $st->execute([(int)$row['id']]);
    $db->commit();
  } catch (Throwable $t) { $db->rollBack(); throw $t; }
  audit((int)$row['user_id'], 'user.reset');
  json_ok(['reset' => true]);
}

if (route_match('POST /auth/delete', $method, $path)) {
  csrf_check();
  $u = require_auth();
  $b = json_body();
  $confirm = (string)($b['confirm'] ?? '');
  $pass = (string)($b['password'] ?? '');
  if ($confirm !== 'DELETE') json_error('Type DELETE to confirm.', 422);
  $st = db()->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
  $st->execute([(int)$u['id']]);
  $hash = (string)$st->fetchColumn();
  if (!password_verify($pass, $hash)) json_error('Incorrect password.', 401);
  audit((int)$u['id'], 'user.delete.request');
  $st = db()->prepare('DELETE FROM users WHERE id = ?');
  $st->execute([(int)$u['id']]);
  logout_user();
  json_ok(['deleted' => true]);
}

// ---- Preferences / onboarding -------------------------------------------------
if (route_match('GET /preferences', $method, $path)) {
  $u = require_auth();
  $st = db()->prepare('SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1');
  $st->execute([(int)$u['id']]);
  json_ok($st->fetch() ?: new stdClass());
}
if (route_match('PUT /preferences', $method, $path)) {
  csrf_check(); $u = require_auth(); $b = json_body();
  $level = in_array($b['level'] ?? '', ['A0','A1','A2','B1','B2'], true) ? $b['level'] : 'A0';
  $goal = mb_substr(trim((string)($b['goal'] ?? 'everyday')), 0, 120) ?: 'everyday';
  $mins = max(5, min(180, (int)($b['daily_minutes'] ?? 15)));
  $lang = in_array($b['ui_lang'] ?? 'en', ['en','fr'], true) ? $b['ui_lang'] : 'en';
  $tr = isset($b['transliteration']) ? (int)(bool)$b['transliteration'] : 1;
  $news = isset($b['email_news']) ? (int)(bool)$b['email_news'] : 0;
  $st = db()->prepare('INSERT INTO user_preferences (user_id, level, goal, daily_minutes, ui_lang, transliteration, email_news) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE level=VALUES(level), goal=VALUES(goal), daily_minutes=VALUES(daily_minutes), ui_lang=VALUES(ui_lang), transliteration=VALUES(transliteration), email_news=VALUES(email_news)');
  $st->execute([(int)$u['id'], $level, $goal, $mins, $lang, $tr, $news]);
  json_ok(['saved' => true]);
}
if (route_match('POST /onboarding', $method, $path)) {
  csrf_check(); $u = require_auth(); $b = json_body();
  $step = mb_substr(trim((string)($b['step'] ?? '')), 0, 60);
  if ($step === '') json_error('Missing step.', 422);
  $answer = $b['answer'] ?? null;
  if ($answer === null) json_error('Missing answer.', 422);
  $st = db()->prepare('INSERT INTO onboarding_responses (user_id, step, answer) VALUES (?,?,?) ON DUPLICATE KEY UPDATE answer=VALUES(answer)');
  $st->execute([(int)$u['id'], $step, json_encode($answer, JSON_UNESCAPED_UNICODE)]);
  // Convenience: map known steps onto preferences
  if ($step === 'level' && is_string($answer) && in_array($answer, ['A0','A1','A2','B1','B2'], true)) {
    $s = db()->prepare('UPDATE user_preferences SET level=? WHERE user_id=?'); $s->execute([$answer, (int)$u['id']]);
  }
  if ($step === 'goal' && is_string($answer)) {
    $s = db()->prepare('UPDATE user_preferences SET goal=? WHERE user_id=?'); $s->execute([mb_substr($answer,0,120), (int)$u['id']]);
  }
  json_ok(['saved' => true]);
}

// ---- Lessons -------------------------------------------------------------------
if (route_match('GET /lessons', $method, $path)) {
  $level = (string)($_GET['level'] ?? '');
  $cat = (string)($_GET['category'] ?? '');
  $q = trim((string)($_GET['q'] ?? ''));
  $sql = 'SELECT l.*, (SELECT COUNT(*) FROM lesson_sections s WHERE s.lesson_id = l.id) AS sections FROM lessons l WHERE is_published = 1';
  $args = [];
  if (in_array($level, ['A0','A1','A2','B1','B2'], true)) { $sql .= ' AND level = ?'; $args[] = $level; }
  if ($cat !== '' && strlen($cat) <= 80) { $sql .= ' AND category = ?'; $args[] = $cat; }
  if ($q !== '') { $sql .= ' AND (title LIKE ? OR summary LIKE ?)'; $args[] = "%$q%"; $args[] = "%$q%"; }
  $sql .= ' ORDER BY sort_order ASC, id ASC LIMIT 200';
  $st = db()->prepare($sql); $st->execute($args);
  $lessons = $st->fetchAll();
  $u = current_user();
  $done = [];
  if ($u) {
    $st = db()->prepare('SELECT lesson_id, status FROM lesson_progress WHERE user_id = ?');
    $st->execute([(int)$u['id']]);
    foreach ($st->fetchAll() as $r) $done[(int)$r['lesson_id']] = $r['status'];
  }
  foreach ($lessons as &$l) { $l['my_status'] = $done[(int)$l['id']] ?? null; $l['objectives'] = $l['objectives'] ? json_decode((string)$l['objectives'], true) : []; }
  json_ok(['lessons' => $lessons]);
}
if (route_match('GET /lessons/:slug', $method, $path, $params)) {
  $st = db()->prepare('SELECT * FROM lessons WHERE slug = ? AND is_published = 1 LIMIT 1');
  $st->execute([(string)$params['slug']]);
  $lesson = $st->fetch();
  if (!$lesson) json_error('Lesson not found', 404);
  $st = db()->prepare('SELECT id, kind, heading, body_md, payload FROM lesson_sections WHERE lesson_id = ? ORDER BY sort_order ASC');
  $st->execute([(int)$lesson['id']]);
  $lesson['sections'] = $st->fetchAll();
  $lesson['objectives'] = $lesson['objectives'] ? json_decode((string)$lesson['objectives'], true) : [];
  $u = current_user();
  $lesson['my_status'] = null;
  if ($u) {
    $st = db()->prepare('SELECT status, score FROM lesson_progress WHERE user_id = ? AND lesson_id = ? LIMIT 1');
    $st->execute([(int)$u['id'], (int)$lesson['id']]);
    $lesson['my_status'] = $st->fetch() ?: null;
  }
  json_ok(['lesson' => $lesson]);
}
if (route_match('POST /lessons/progress', $method, $path)) {
  csrf_check(); $u = require_auth(); $b = json_body();
  $lid = (int)($b['lesson_id'] ?? 0);
  $status = ($b['status'] ?? 'started') === 'completed' ? 'completed' : 'started';
  $score = isset($b['score']) ? max(0, min(100, (int)$b['score'])) : null;
  if ($lid <= 0) json_error('Missing lesson.', 422);
  $db = db();
  $st = $db->prepare('INSERT INTO lesson_progress (user_id, lesson_id, status, score, completed_at) VALUES (?,?,?, ?, ' . ($status === 'completed' ? 'NOW()' : 'NULL') . ') ON DUPLICATE KEY UPDATE status=VALUES(status), score=COALESCE(VALUES(score),score)' . ($status === 'completed' ? ', completed_at=NOW()' : ''));
  $st->execute([(int)$u['id'], $lid, $status, $score]);
  $st = $db->prepare("INSERT INTO user_activity (user_id, kind, ref_type, ref_id) VALUES (?,?, 'lesson', ?)");
  $st->execute([(int)$u['id'], $status === 'completed' ? 'lesson_complete' : 'lesson_start', $lid]);
  json_ok(['saved' => true, 'status' => $status]);
}

// ---- Vocabulary -----------------------------------------------------------------
if (route_match('GET /vocab', $method, $path)) {
  $u = require_auth();
  $q = trim((string)($_GET['q'] ?? ''));
  $fav = (string)($_GET['favorites'] ?? '') === '1';
  $due = (string)($_GET['due'] ?? '') === '1';
  $sql = 'SELECT * FROM user_vocabulary WHERE user_id = ?';
  $args = [(int)$u['id']];
  if ($fav) $sql .= ' AND is_favorite = 1';
  if ($due) $sql .= ' AND (next_review_at IS NULL OR next_review_at <= NOW())';
  if ($q !== '') { $sql .= ' AND (darija_ar LIKE ? OR transliteration LIKE ? OR english LIKE ?)'; array_push($args, "%$q%", "%$q%", "%$q%"); }
  $sql .= ' ORDER BY updated_at DESC LIMIT 500';
  $st = db()->prepare($sql); $st->execute($args);
  json_ok(['items' => $st->fetchAll()]);
}
if (route_match('POST /vocab', $method, $path)) {
  csrf_check(); $u = require_auth(); $b = json_body();
  $darija = trim(mb_substr((string)($b['darija_ar'] ?? ''), 0, 255));
  $en = trim(mb_substr((string)($b['english'] ?? ''), 0, 255));
  if ($darija === '' || $en === '') json_error('Darija and English are required.', 422);
  $st = db()->prepare('INSERT INTO user_vocabulary (user_id, vocab_id, darija_ar, transliteration, english, example_darija, example_en, is_favorite, next_review_at) VALUES (?,?,?,?,?,?,?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))');
  $st->execute([(int)$u['id'], isset($b['vocab_id']) ? (int)$b['vocab_id'] : null, $darija, mb_substr((string)($b['transliteration'] ?? ''),0,255), $en, mb_substr((string)($b['example_darija'] ?? ''),0,500), mb_substr((string)($b['example_en'] ?? ''),0,500), !empty($b['is_favorite']) ? 1 : 0]);
  json_ok(['id' => (int)db()->lastInsertId()], 201);
}
if (route_match('PUT /vocab/:id', $method, $path, $params)) {
  csrf_check(); $u = require_auth(); $b = json_body();
  $st = db()->prepare('SELECT id FROM user_vocabulary WHERE id = ? AND user_id = ? LIMIT 1');
  $st->execute([(int)$params['id'], (int)$u['id']]);
  if (!$st->fetch()) json_error('Not found', 404);
  $st = db()->prepare('UPDATE user_vocabulary SET is_favorite = ?, mastery = ?, updated_at = NOW() WHERE id = ? AND user_id = ?');
  $st->execute([!empty($b['is_favorite']) ? 1 : 0, max(0, min(5, (int)($b['mastery'] ?? 0))), (int)$params['id'], (int)$u['id']]);
  json_ok(['saved' => true]);
}
if (route_match('DELETE /vocab/:id', $method, $path, $params)) {
  csrf_check(); $u = require_auth();
  $st = db()->prepare('DELETE FROM user_vocabulary WHERE id = ? AND user_id = ?');
  $st->execute([(int)$params['id'], (int)$u['id']]);
  json_ok(['deleted' => true]);
}
if (route_match('POST /vocab/review', $method, $path)) {
  // SM-2 lite: quality 0..5 → intervals 1/3/7/14/30 days; mastery = quality.
  csrf_check(); $u = require_auth(); $b = json_body();
  $id = (int)($b['id'] ?? 0); $q = max(0, min(5, (int)($b['quality'] ?? 0)));
  $st = db()->prepare('SELECT id FROM user_vocabulary WHERE id = ? AND user_id = ? LIMIT 1');
  $st->execute([$id, (int)$u['id']]);
  if (!$st->fetch()) json_error('Not found', 404);
  $days = [0 => 1, 1 => 1, 2 => 3, 3 => 7, 4 => 14, 5 => 30][$q];
  $db = db(); $db->beginTransaction();
  try {
    $st = $db->prepare('UPDATE user_vocabulary SET mastery = ?, next_review_at = DATE_ADD(NOW(), INTERVAL ' . $days . ' DAY) WHERE id = ? AND user_id = ?');
    $st->execute([$q, $id, (int)$u['id']]);
    $st = $db->prepare('INSERT INTO vocabulary_reviews (user_id, user_vocab_id, quality) VALUES (?,?,?)');
    $st->execute([(int)$u['id'], $id, $q]);
    $st = $db->prepare("INSERT INTO user_activity (user_id, kind, ref_type, ref_id) VALUES (?, 'vocab_review', 'vocab', ?)");
    $st->execute([(int)$u['id'], $id]);
    $db->commit();
  } catch (Throwable $t) { $db->rollBack(); throw $t; }
  json_ok(['saved' => true, 'next_in_days' => $days]);
}

// ---- AI tutor --------------------------------------------------------------------
if (route_match('GET /tutor/sessions', $method, $path)) {
  $u = require_auth();
  $st = db()->prepare('SELECT id, mode, title, updated_at FROM conversation_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50');
  $st->execute([(int)$u['id']]);
  json_ok(['sessions' => $st->fetchAll()]);
}
if (route_match('POST /tutor/sessions', $method, $path)) {
  csrf_check(); $u = require_auth(); $b = json_body();
  $mode = (string)($b['mode'] ?? 'free');
  if (!in_array($mode, ['free','roleplay','guided','vocab','correction','culture','travel','revision'], true)) $mode = 'free';
  $title = trim(mb_substr((string)($b['title'] ?? 'New conversation'), 0, 220)) ?: 'New conversation';
  $st = db()->prepare('INSERT INTO conversation_sessions (user_id, mode, title) VALUES (?,?,?)');
  $st->execute([(int)$u['id'], $mode, $title]);
  json_ok(['id' => (int)db()->lastInsertId(), 'mode' => $mode], 201);
}
if (route_match('GET /tutor/messages', $method, $path)) {
  $u = require_auth();
  $sid = (int)($_GET['session_id'] ?? 0);
  $st = db()->prepare('SELECT id FROM conversation_sessions WHERE id = ? AND user_id = ? LIMIT 1');
  $st->execute([$sid, (int)$u['id']]);
  if (!$st->fetch()) json_error('Session not found', 404);
  $st = db()->prepare('SELECT id, role, content, created_at FROM conversation_messages WHERE session_id = ? ORDER BY id ASC LIMIT 200');
  $st->execute([$sid]);
  [$used, $limit] = ai_quota((int)$u['id']);
  json_ok(['messages' => $st->fetchAll(), 'quota' => ['used' => $used, 'limit' => $limit]]);
}
if (route_match('POST /tutor/messages', $method, $path)) {
  csrf_check(); $u = require_auth();
  if (!rate_limit_check('ai:' . (int)$u['id'], 60, 3600)) json_error('Slow down — too many messages.', 429);
  $b = json_body();
  $text = trim(mb_substr((string)($b['message'] ?? ''), 0, 2000));
  if ($text === '') json_error('Write a message first.', 422);
  $mode = (string)($b['mode'] ?? 'free');
  if (!in_array($mode, ['free','roleplay','guided','vocab','correction','culture','travel','revision'], true)) $mode = 'free';
  [$used, $limit] = ai_quota((int)$u['id']);
  if ($used >= $limit) json_error('Daily AI limit reached (' . $limit . '). ' . (is_premium((int)$u['id']) ? 'Resets at midnight UTC.' : 'Upgrade to Premium for 200/day.'), 429);
  $db = db();
  $sid = (int)($b['session_id'] ?? 0);
  if ($sid > 0) {
    $st = $db->prepare('SELECT id, mode FROM conversation_sessions WHERE id = ? AND user_id = ? LIMIT 1');
    $st->execute([$sid, (int)$u['id']]);
    $sess = $st->fetch();
    if (!$sess) json_error('Session not found', 404);
    $mode = $sess['mode'];
  } else {
    $st = $db->prepare('INSERT INTO conversation_sessions (user_id, mode, title) VALUES (?,?,?)');
    $st->execute([(int)$u['id'], $mode, mb_substr($text, 0, 60)]);
    $sid = (int)$db->lastInsertId();
  }
  $db->beginTransaction();
  try {
    $st = $db->prepare("INSERT INTO conversation_messages (session_id, role, content) VALUES (?, 'user', ?)");
    $st->execute([$sid, $text]);
    $st = $db->prepare('SELECT role, content FROM conversation_messages WHERE session_id = ? ORDER BY id ASC LIMIT 40');
    $st->execute([$sid]);
    $history = $st->fetchAll();
    $db->commit();
  } catch (Throwable $t) { $db->rollBack(); throw $t; }

  $res = gemini_chat($history, darija_system_prompt($mode));
  if (isset($res['error'])) {
    // Do not fabricate AI responses: persist the user message, return the error honestly.
    json_error($res['error'], 503, ['session_id' => $sid]);
  }
  $db->beginTransaction();
  try {
    $st = $db->prepare('INSERT INTO conversation_messages (session_id, role, content, tokens_in, tokens_out) VALUES (?, ?, ?, ?, ?)');
    $st->execute([$sid, 'assistant', $res['text'], (int)$res['tokens_in'], (int)$res['tokens_out']]);
    $st = $db->prepare("INSERT INTO usage_records (user_id, kind, units, meta) VALUES (?, 'ai_message', 1, ?)");
    $st->execute([(int)$u['id'], json_encode(['session' => $sid, 'mode' => $mode, 'in' => (int)$res['tokens_in'], 'out' => (int)$res['tokens_out']])]);
    $st = $db->prepare('UPDATE conversation_sessions SET updated_at = NOW() WHERE id = ?');
    $st->execute([$sid]);
    $db->commit();
  } catch (Throwable $t) { $db->rollBack(); throw $t; }
  [$used2, $limit2] = ai_quota((int)$u['id']);
  json_ok(['reply' => $res['text'], 'session_id' => $sid, 'quota' => ['used' => $used2, 'limit' => $limit2]]);
}
if (route_match('DELETE /tutor/sessions/:id', $method, $path, $params)) {
  csrf_check(); $u = require_auth();
  $st = db()->prepare('DELETE FROM conversation_sessions WHERE id = ? AND user_id = ?');
  $st->execute([(int)$params['id'], (int)$u['id']]);
  json_ok(['deleted' => true]);
}

// ---- Progress / goals --------------------------------------------------------------
if (route_match('GET /progress', $method, $path)) {
  $u = require_auth(); $uid = (int)$u['id']; $db = db();
  $q = fn(string $sql, array $a = []) => (function () use ($db, $sql, $a) { $st = $db->prepare($sql); $st->execute($a); return $st->fetchAll(); });
  $one = function (string $sql, array $a = []) use ($db) { $st = $db->prepare($sql); $st->execute($a); return $st->fetchColumn(); };
  $completed = (int)$one('SELECT COUNT(*) FROM lesson_progress WHERE user_id = ? AND status = ?', [$uid, 'completed']);
  $started = (int)$one('SELECT COUNT(*) FROM lesson_progress WHERE user_id = ? AND status = ?', [$uid, 'started']);
  $totalLessons = (int)$one('SELECT COUNT(*) FROM lessons WHERE is_published = 1');
  $vocab = (int)$one('SELECT COUNT(*) FROM user_vocabulary WHERE user_id = ?', [$uid]);
  $mastered = (int)$one('SELECT COUNT(*) FROM user_vocabulary WHERE user_id = ? AND mastery >= 4', [$uid]);
  $due = (int)$one('SELECT COUNT(*) FROM user_vocabulary WHERE user_id = ? AND (next_review_at IS NULL OR next_review_at <= NOW())', [$uid]);
  $reviewsToday = (int)$one('SELECT COUNT(*) FROM vocabulary_reviews WHERE user_id = ? AND reviewed_at >= CURDATE()', [$uid]);
  [$aiUsed, $aiLimit] = ai_quota($uid);
  $streakRows = $q('SELECT DISTINCT DATE(created_at) d FROM user_activity WHERE user_id = ? ORDER BY d DESC LIMIT 60', [$uid]);
  $streak = 0; $day = new DateTimeImmutable('today', new DateTimeZone('UTC'));
  $set = array_flip(array_column($streakRows, 'd'));
  while (isset($set[$day->format('Y-m-d')])) { $streak++; $day = $day->modify('-1 day'); }
  // If no activity today, streak may still continue from yesterday (learner-friendly).
  if ($streak === 0) { $day = new DateTimeImmutable('yesterday', new DateTimeZone('UTC')); while (isset($set[$day->format('Y-m-d')])) { $streak++; $day = $day->modify('-1 day'); } }
  $recent = $q('SELECT kind, ref_type, ref_id, created_at FROM user_activity WHERE user_id = ? ORDER BY id DESC LIMIT 10', [$uid]);
  json_ok(compact('completed', 'started', 'totalLessons', 'vocab', 'mastered', 'due', 'reviewsToday', 'streak', 'recent') + ['ai' => ['used' => $aiUsed, 'limit' => $aiLimit], 'premium' => is_premium($uid)]);
}
if (route_match('GET /goals', $method, $path)) {
  $u = require_auth();
  $st = db()->prepare('SELECT * FROM learning_goals WHERE user_id = ? ORDER BY is_done ASC, created_at DESC LIMIT 50');
  $st->execute([(int)$u['id']]);
  json_ok(['goals' => $st->fetchAll()]);
}
if (route_match('POST /goals', $method, $path)) {
  csrf_check(); $u = require_auth(); $b = json_body();
  $title = trim(mb_substr((string)($b['title'] ?? ''), 0, 200));
  if ($title === '') json_error('Give your goal a title.', 422);
  $lvl = in_array($b['target_level'] ?? '', ['A0','A1','A2','B1','B2'], true) ? $b['target_level'] : null;
  $st = db()->prepare('INSERT INTO learning_goals (user_id, title, target_level, target_date) VALUES (?,?,?,?)');
  $st->execute([(int)$u['id'], $title, $lvl, !empty($b['target_date']) ? substr((string)$b['target_date'], 0, 10) : null]);
  json_ok(['id' => (int)db()->lastInsertId()], 201);
}

// ---- Subscriptions / billing ----------------------------------------------------------
if (route_match('GET /subscription', $method, $path)) {
  $u = require_auth();
  $st = db()->prepare('SELECT plan, status, current_period_end, cancel_at_period_end FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1');
  $st->execute([(int)$u['id']]);
  $sub = $st->fetch() ?: null;
  $st = db()->prepare('SELECT id, type, created_at FROM payment_events WHERE user_id = ? ORDER BY id DESC LIMIT 20');
  $st->execute([(int)$u['id']]);
  json_ok(['premium' => is_premium((int)$u['id']), 'subscription' => $sub, 'history' => $st->fetchAll(), 'billing' => billing_status()]);
}
if (route_match('POST /subscription/checkout', $method, $path)) {
  csrf_check(); $u = require_auth(); $b = json_body();
  $plan = ($b['plan'] ?? 'premium_monthly') === 'premium_yearly' ? 'premium_yearly' : 'premium_monthly';
  $r = stripe_checkout((int)$u['id'], (string)$u['email'], $plan);
  if (isset($r['error'])) json_error($r['error'], 400, ['billing' => billing_status()]);
  audit((int)$u['id'], 'billing.checkout', 'plan', $plan);
  json_ok(['url' => $r['url']]);
}
if (route_match('POST /subscription/cancel', $method, $path)) {
  csrf_check(); $u = require_auth();
  // Cancels at period end locally; Stripe subscription cancel is applied on webhook sync.
  // If Stripe is live, the dashboard cancel propagates via customer.subscription.updated.
  $st = db()->prepare('UPDATE subscriptions SET cancel_at_period_end = 1 WHERE user_id = ? AND status IN (\'active\',\'trialing\')');
  $st->execute([(int)$u['id']]);
  audit((int)$u['id'], 'billing.cancel');
  json_ok(['cancelled' => true, 'note' => 'Your premium stays active until the end of the billing period.']);
}
if (route_match('POST /webhooks/stripe', $method, $path)) {
  $payload = file_get_contents('php://input') ?: '';
  if (strlen($payload) > 1024 * 1024) json_error('Payload too large', 413);
  $sig = (string)($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '');
  $secret = (string)cfg('stripe_webhook_secret', '');
  if ($secret === '' || !stripe_verify_signature($payload, $sig, $secret)) json_error('Invalid signature', 400);
  $event = json_decode($payload, true);
  if (!is_array($event)) json_error('Bad payload', 400);
  stripe_apply_event($event);
  json_ok(['received' => true]);
}

// ---- Public forms -----------------------------------------------------------------------
if (route_match('POST /contact', $method, $path)) {
  csrf_check();
  if (!rate_limit_check('contact:' . client_ip(), 5, 3600)) json_error('Too many messages. Try later.', 429);
  $b = json_body();
  $name = trim(mb_substr((string)($b['name'] ?? ''), 0, 160));
  $email = strtolower(trim((string)($b['email'] ?? '')));
  $msg = trim(mb_substr((string)($b['message'] ?? ''), 0, 5000));
  $subject = trim(mb_substr((string)($b['subject'] ?? 'Contact'), 0, 220));
  if ($name === '' || !valid_email($email) || mb_strlen($msg) < 5) json_error('Please complete name, valid email and message.', 422);
  $u = current_user();
  $st = db()->prepare('INSERT INTO support_messages (user_id, name, email, subject, message) VALUES (?,?,?,?,?)');
  $st->execute([$u ? (int)$u['id'] : null, $name, $email, $subject, $msg]);
  json_ok(['sent' => true], 201);
}
if (route_match('POST /newsletter', $method, $path)) {
  csrf_check();
  $b = json_body();
  $email = strtolower(trim((string)($b['email'] ?? '')));
  if (!valid_email($email)) json_error('Enter a valid email address.', 422);
  $st = db()->prepare("INSERT INTO newsletter_subscribers (email, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE status='active'");
  $st->execute([$email, bin2hex(random_bytes(16))]);
  json_ok(['subscribed' => true], 201);
}

// ---- Admin ---------------------------------------------------------------------------------
if (str_starts_with($path, '/admin/')) {
  $admin = require_admin();
  if (route_match('GET /admin/stats', $method, $path)) {
    $db = db();
    $c = fn(string $sql) => (int)$db->query($sql)->fetchColumn();
    json_ok([
      'users' => $c('SELECT COUNT(*) FROM users'),
      'verified' => $c('SELECT COUNT(*) FROM users WHERE is_verified = 1'),
      'premium' => $c("SELECT COUNT(*) FROM users WHERE plan = 'premium'"),
      'lessons' => $c('SELECT COUNT(*) FROM lessons'),
      'messages_today' => $c("SELECT COUNT(*) FROM usage_records WHERE kind='ai_message' AND created_at >= CURDATE()"),
      'support_open' => $c("SELECT COUNT(*) FROM support_messages WHERE status='open'"),
      'signups_7d' => $c('SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'),
    ]);
  }
  if (route_match('GET /admin/users', $method, $path)) {
    $q = trim((string)($_GET['q'] ?? ''));
    $sql = 'SELECT u.id, u.email, u.display_name, u.is_verified, u.is_active, u.is_admin, u.plan, u.created_at FROM users u';
    $args = [];
    if ($q !== '') { $sql .= ' WHERE u.email LIKE ? OR u.display_name LIKE ?'; $args = ["%$q%", "%$q%"]; }
    $sql .= ' ORDER BY u.id DESC LIMIT 100';
    $st = db()->prepare($sql); $st->execute($args);
    json_ok(['users' => $st->fetchAll()]);
  }
  if (route_match('GET /admin/support', $method, $path)) {
    $st = db()->query("SELECT * FROM support_messages ORDER BY FIELD(status,'open','answered','closed'), id DESC LIMIT 100");
    json_ok(['messages' => $st->fetchAll()]);
  }
  if (route_match('POST /admin/support', $method, $path)) {
    csrf_check();
    $b = json_body();
    $id = (int)($b['id'] ?? 0);
    $status = in_array($b['status'] ?? '', ['open','answered','closed'], true) ? $b['status'] : 'answered';
    $st = db()->prepare('UPDATE support_messages SET status = ? WHERE id = ?');
    $st->execute([$status, $id]);
    audit((int)$admin['id'], 'admin.support.update', 'support', (string)$id, ['status' => $status]);
    json_ok(['saved' => true]);
  }
  if (route_match('GET /admin/lessons', $method, $path)) {
    $st = db()->query('SELECT * FROM lessons ORDER BY sort_order ASC, id ASC LIMIT 200');
    json_ok(['lessons' => $st->fetchAll()]);
  }
  if (route_match('POST /admin/lessons', $method, $path)) {
    csrf_check();
    $b = json_body();
    $slug = trim(mb_substr((string)($b['slug'] ?? ''), 0, 160));
    if ($slug === '' || !preg_match('/^[a-z0-9\-]+$/', $slug)) json_error('Slug must be lowercase letters, numbers and dashes.', 422);
    $st = db()->prepare('INSERT INTO lessons (slug, level, category, title, summary, objectives, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE level=VALUES(level), category=VALUES(category), title=VALUES(title), summary=VALUES(summary), objectives=VALUES(objectives), is_published=VALUES(is_published), sort_order=VALUES(sort_order)');
    $st->execute([$slug, in_array($b['level'] ?? '', ['A0','A1','A2','B1','B2'], true) ? $b['level'] : 'A0', mb_substr((string)($b['category'] ?? 'general'),0,80), mb_substr((string)($b['title'] ?? $slug),0,220), mb_substr((string)($b['summary'] ?? ''),0,500), json_encode($b['objectives'] ?? []), !empty($b['is_published']) ? 1 : 0, (int)($b['sort_order'] ?? 0)]);
    audit((int)$admin['id'], 'admin.lesson.save', 'lesson', $slug);
    json_ok(['saved' => true]);
  }
  json_error('Unknown admin endpoint', 404);
}

json_error('Not found', 404);
