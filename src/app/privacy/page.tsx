import Link from 'next/link';

export const metadata = { title: 'Privacy — Lodge' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 md:py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: 2026-05-06</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Who runs Lodge</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Lodge is a private marketplace built for residents of a single student lodge. It is
          operated by the lodge admin (Ian) for the residents&apos; benefit and is not a commercial
          service. There are no payments processed on the platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">What we collect</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>Account: email address, password (hashed), display name.</li>
          <li>Profile: avatar, short bio, room number (visible to other approved residents).</li>
          <li>Listings: title, description, category, condition, price, photos.</li>
          <li>Messages: the text of chats you send to other residents.</li>
          <li>
            Moderation data: reports you submit, blocks you set, ratings you give and receive.
          </li>
          <li>
            Technical: standard web request metadata (IP, user agent) handled by our hosting
            provider for abuse prevention.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Who can see your data</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Other approved residents can see your public profile (display name, avatar, bio,
            average rating) and your live listings.
          </li>
          <li>
            The other party in a chat can see the messages you sent in that chat. Messages are
            never shown to other residents.
          </li>
          <li>
            <strong className="text-foreground">
              Admins can read messages, listings, and reports to moderate the platform.
            </strong>{' '}
            They will only do this when investigating a report or enforcing the rules.
          </li>
          <li>Your room number, email, and password are never shown on public profile views.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Where your data is stored</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Data is stored on Insforge, a managed Postgres backend hosted in the European Union
          (eu-central). Connections are encrypted in transit (HTTPS/TLS) and at rest by the
          underlying cloud provider&apos;s disk encryption. Photos are stored in the same provider
          under access-controlled buckets.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">How long we keep it</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We keep your data while your account is active. When you delete your account, we
          soft-delete your profile: your display name is replaced with &ldquo;Deleted user&rdquo;,
          your avatar, bio and room number are removed, and your listings are hidden. Past
          messages remain visible to the other party but appear as sent by &ldquo;Deleted
          user&rdquo;, since deleting messages would erase the other side of their conversation.
          You can request full deletion of your past messages by contacting the admin.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Your rights under GDPR</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          As a resident in the EU, you have the right to access, rectify, delete, restrict, and
          port your data, and to object to its processing. To exercise any of these, use the
          built-in editing tools in your profile, the &ldquo;Delete my account&rdquo; button in
          settings, or contact the admin directly.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Legal basis</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We process your data on the basis of your consent (Art. 6(1)(a) GDPR) when you sign up,
          and on the basis of legitimate interest (Art. 6(1)(f) GDPR) for moderation, abuse
          prevention, and keeping the lodge community safe.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Contact</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          For any privacy question or to exercise your rights, contact the lodge admin in person
          or by email.
        </p>
      </section>

      <div className="pt-4">
        <Link
          href="/login"
          className="text-sm text-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
