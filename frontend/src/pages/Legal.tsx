import { PageHero } from '../components/Layout';
import { useSeo } from '../lib/seo';

export function Legal({ title, path, updated, children }: { title: string; path: string; updated: string; children: React.ReactNode }) {
  useSeo(`${title} | Langzio`, `${title} for langzio.com.`, path);
  return (
    <>
      <PageHero eyebrow="Legal" title={title} lede={`Last updated: ${updated}`} />
      <div className="container-x pb-12 max-w-3xl card space-y-3 text-sm text-stone-700">{children}</div>
    </>
  );
}

export function Privacy() {
  return (
    <Legal title="Privacy Policy" path="/privacy" updated="October 2026">
      <p><strong>What we store:</strong> your account (email, name, password hash), preferences, onboarding answers, lesson progress, vocabulary, AI conversations, usage records, subscriptions and support messages — in our MySQL database. We never store passwords in plain text (bcrypt via password_hash).</p>
      <p><strong>What we never do:</strong> sell your data, expose private dashboard/admin pages to search engines (robots disallow + login required), or put API keys in the browser. AI requests are proxied server-side.</p>
      <p><strong>Cookies:</strong> one essential session cookie (HttpOnly, Secure on HTTPS, SameSite=Lax) plus a CSRF token. See /cookies.</p>
      <p><strong>Your rights:</strong> access, correct, export and delete your data. Delete anytime at /delete-account or Settings. Deletion removes your profile, progress, vocabulary and conversations (payment events may be retained for legal accounting).</p>
      <p><strong>Contact:</strong> privacy@langzio.com via /contact.</p>
    </Legal>
  );
}

export function Terms() {
  return (
    <Legal title="Terms of Service" path="/terms" updated="October 2026">
      <p><strong>Service:</strong> Langzio teaches practical Moroccan Darija (levels A0–B2 are our own learning stages, not an official certification). AI answers may contain mistakes — verify important travel/legal/medical phrases locally.</p>
      <p><strong>Accounts:</strong> you are responsible for your credentials. We may suspend accounts for abuse (spam, scraping, quota circumvention).</p>
      <p><strong>Subscriptions:</strong> Free and Premium. Premium is granted only after verified payment webhooks. Cancel anytime; access continues to the end of the billing period. Prices are configured server-side.</p>
      <p><strong>Acceptable use:</strong> no unlawful content, no attempts to extract other users' data, no reselling AI quotas.</p>
    </Legal>
  );
}

export function Cookies() {
  return (
    <Legal title="Cookie Policy" path="/cookies" updated="October 2026">
      <p><strong>Essential only:</strong> session cookie (login, 14 days, HttpOnly + Secure + SameSite=Lax) and CSRF token. No advertising or cross-site tracking cookies.</p>
      <p><strong>How to control:</strong> clear cookies in your browser — you will simply be logged out. Private pages require the session cookie to function.</p>
    </Legal>
  );
}
