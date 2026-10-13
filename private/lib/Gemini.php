<?php
declare(strict_types=1);
// Gemini proxy. Called ONLY from the backend — the key never leaves the server.
function gemini_chat(array $history, string $systemPrompt, int $timeoutSec = 40): array {
  $key = (string)cfg('gemini_api_key', '');
  if ($key === '') return ['error' => 'AI is not configured yet. The administrator must set GEMINI_API_KEY.'];
  $model = (string)cfg('gemini_model', 'gemini-2.0-flash');
  $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . urlencode($model) . ':generateContent?key=' . urlencode($key);

  $contents = [];
  foreach ($history as $m) {
    $role = ($m['role'] ?? 'user') === 'assistant' ? 'model' : 'user';
    $text = mb_substr((string)($m['content'] ?? ''), 0, 4000);
    if ($text === '') continue;
    $contents[] = ['role' => $role, 'parts' => [['text' => $text]]];
  }
  // Keep last 20 turns to control cost.
  $contents = array_slice($contents, -20);

  $payload = [
    'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
    'contents' => $contents ?: [['role' => 'user', 'parts' => [['text' => 'Say hello in Darija.']]]],
    'generationConfig' => ['temperature' => 0.7, 'maxOutputTokens' => 700],
  ];

  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => $timeoutSec,
    CURLOPT_CONNECTTIMEOUT => 10,
  ]);
  $raw = curl_exec($ch);
  $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err = curl_error($ch);
  curl_close($ch);

  if ($raw === false || $http < 200 || $http >= 300) {
    error_log('[langzio][gemini] http=' . $http . ' err=' . $err . ' body=' . mb_substr((string)$raw, 0, 500));
    return ['error' => 'The AI tutor is temporarily unavailable. Please try again in a minute — your messages are saved.'];
  }
  $d = json_decode((string)$raw, true);
  $text = $d['candidates'][0]['content']['parts'][0]['text'] ?? '';
  if (!is_string($text) || trim($text) === '') {
    // Do NOT fabricate a tutoring answer. Surface the failure honestly.
    return ['error' => 'The AI returned an empty reply. Please rephrase and try again.'];
  }
  $in = $d['usageMetadata']['promptTokenCount'] ?? 0;
  $out = $d['usageMetadata']['candidatesTokenCount'] ?? 0;
  return ['text' => $text, 'tokens_in' => (int)$in, 'tokens_out' => (int)$out];
}

function darija_system_prompt(string $mode): string {
  $base = "You are Langzio, a friendly expert teacher of MOROCCAN DARIJA (not Modern Standard Arabic, not Egyptian). "
    . "Always teach real Moroccan Darija as spoken in Casablanca/Rabat/Marrakech. "
    . "For each new Darija word or phrase, give THREE lines: 1) Arabic script (e.g. لاباس), 2) Latin transliteration (e.g. labas — warn that Latin spelling varies: shukran/choukran, 3/qaf etc.), 3) English translation. "
    . "Add a short usage note and one natural example with translation when helpful. Add cultural context briefly when relevant. "
    . "Never present uncertain etymology or dialect claims as facts; say when usage varies by region. "
    . "Keep replies focused and learner-friendly (under ~180 words unless the user asks for more). "
    . "If the user writes in English or French, answer in that language while teaching Darija. Correct mistakes kindly.";
  $modes = [
    'roleplay'   => ' MODE: roleplay. Play a role (shopkeeper, taxi driver, waiter). Stay in character, keep it simple for the learner level, and correct at the end.',
    'guided'     => ' MODE: guided lesson. Teach step by step, one point at a time, and ask a short practice question.',
    'vocab'      => ' MODE: vocabulary practice. Quiz the user with 3 words at a time, give examples, track what they get right.',
    'correction' => ' MODE: correction. Rewrite the user Darija correctly (Arabic + transliteration + English), explain each fix briefly.',
    'culture'    => ' MODE: cultural explainer. Explain Moroccan customs behind the language (hospitality, tea, politeness).',
    'travel'     => ' MODE: travel survival. Prioritise immediately usable phrases (taxi, hotel, food, directions, emergencies).',
    'revision'   => ' MODE: revision. Quiz mixed content from earlier turns, spaced and encouraging.',
    'free'       => ' MODE: free conversation. Chat naturally, sprinkle corrections gently.',
  ];
  return $base . ($modes[$mode] ?? $modes['free']);
}
