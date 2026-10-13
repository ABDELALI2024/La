import { PageHero } from '../components/Layout';
import { useSeo } from '../lib/seo';
const faqs: [string, string][] = [
  ['Is Darija the same as Standard Arabic?', 'No. Darija is Morocco’s everyday spoken language. It shares roots with Standard Arabic but has its own vocabulary, pronunciation and grammar. “How much?” is shhal? in Darija, not kam in MSA. Langzio teaches Darija first.'],
  ['How is Darija written?', 'Two ways: Arabic script (لاباس) and Latin transliteration (labas). Latin spelling varies — shukran/choukran, 3 for ع, 7 for ح. We show both and warn about variation.'],
  ['What do A0–B2 mean here?', 'Our own practical stages from absolute beginner (A0) to independent everyday speaker (B2). They are not an official CEFR certificate for Darija — no such standard exists.'],
  ['How does the AI tutor work?', 'Your messages go to our secure PHP backend, which calls the AI provider. Your key is never in the browser. Free: 20 messages/day. Premium: 200/day. Conversations are saved to your account.'],
  ['Do I need to pay?', 'No — Free covers starter lessons, vocabulary and 20 AI messages a day. Premium unlocks all lessons and higher limits. Checkout stays disabled until payments are verified live.'],
  ['Can I delete my account?', 'Yes, anytime: Settings → Danger zone, or the /delete-account page. This permanently deletes your profile, progress, vocabulary and conversations.'],
  ['Which payment methods will you support?', 'Stripe Checkout first (where the business is eligible). Stripe is not directly available for Moroccan-registered businesses, so CMI/PayPal may be added — the billing layer is isolated for that.'],
  ['Is my data private?', 'Yes. Private pages send noindex headers via robots rules and require login. We never sell data. See /privacy.'],
];
export default function Faq() {
  useSeo('FAQ — Moroccan Darija, AI tutor, pricing, privacy', 'Answers about Darija vs Arabic, transliteration, A0–B2 levels, AI quotas, pricing, payments and account deletion.', '/faq');
  return (
    <>
      <PageHero eyebrow="FAQ" title="Questions, answered honestly." />
      <div className="container-x pb-12 max-w-3xl space-y-3">
        {faqs.map(([q, a]) => (
          <details key={q} className="card">
            <summary className="font-bold cursor-pointer">{q}</summary>
            <p className="mt-2 text-sm text-stone-600">{a}</p>
          </details>
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }) }} />
      </div>
    </>
  );
}
