import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { syncLocalSessions } from "@/lib/cloud";
import { RatingCardSection } from "@/components/rating-card";
import { DeveloperPreviewPanel } from "@/components/dev-plan-switcher";

export const Route = createFileRoute("/konto")({
  head: () => ({
    meta: [
      { title: "Konto – spara dina golfresultat" },
      {
        name: "description",
        content:
          "Skapa ett konto eller logga in för att spara dina testresultat och följa din utveckling.",
      },
      { property: "og:title", content: "Konto – spara dina golfresultat" },
      {
        property: "og:description",
        content: "Logga in för att spara resultat under ditt spelarnamn och jämföra dig med andra.",
      },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, displayName, loading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) void syncLocalSessions(user.id);
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const trimmed = name.trim();
        if (trimmed.length < 2 || trimmed.length > 30) {
          setError("Spelarnamnet måste vara 2–30 tecken.");
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/konto` },
        });
        if (signUpError) throw signUpError;
        if (data.session && data.user) {
          await supabase.from("profiles").upsert({ id: data.user.id, display_name: trimmed });
          await syncLocalSessions(data.user.id);
          navigate({ to: "/" });
        } else {
          window.localStorage.setItem("golf-pending-name", trimmed);
          setMessage("Kolla mejlen och bekräfta din adress, sedan kan du logga in.");
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        if (data.user) {
          const pending = window.localStorage.getItem("golf-pending-name");
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", data.user.id)
            .maybeSingle();
          if (!profile) {
            await supabase.from("profiles").upsert({
              id: data.user.id,
              display_name: pending || email.trim().split("@")[0],
            });
          }
          window.localStorage.removeItem("golf-pending-name");
          await syncLocalSessions(data.user.id);
          navigate({ to: "/" });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel. Försök igen.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Spelare</p>
          <h1 className="text-4xl leading-none">Konto</h1>
        </div>
        <Link
          to="/"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Hem
        </Link>
      </header>

      {loading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Laddar …</p>
      ) : user ? (
        <>
          <section className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Inloggad som
              </p>
              <p className="font-[family-name:var(--font-display)] text-3xl text-primary">
                {displayName ?? user.email}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <NameForm currentName={displayName} userId={user.id} />
            <button
              onClick={signOut}
              className="w-full rounded-2xl border border-border py-3 text-sm text-muted-foreground"
            >
              Logga ut
            </button>
          </section>
          <RatingCardSection playerName={displayName ?? user.email?.split("@")[0] ?? "Spelare"} />
        </>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1">
            {(
              [
                ["login", "Logga in"],
                ["signup", "Skapa konto"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`rounded-xl py-2 text-sm font-medium transition-colors ${
                  mode === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form
            onSubmit={submit}
            className="mt-4 space-y-3 rounded-3xl border border-border bg-card p-5"
          >
            {mode === "signup" ? (
              <Field
                label="Spelarnamn"
                value={name}
                onChange={setName}
                placeholder="Visas i topplistan"
                maxLength={30}
              />
            ) : null}
            <Field
              label="E-post"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="din@mail.se"
              maxLength={255}
            />
            <Field
              label="Lösenord"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Minst 6 tecken"
              maxLength={72}
            />
            {error ? <p className="text-sm text-flag">{error}</p> : null}
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-primary py-3 font-medium text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Vänta …" : mode === "signup" ? "Skapa konto" : "Logga in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Resultat du redan sparat på telefonen flyttas automatiskt över till kontot.
          </p>
        </>
      )}

      <DeveloperPreviewPanel />
    </main>
  );
}

function NameForm({ currentName, userId }: { currentName: string | null; userId: string }) {
  const [value, setValue] = useState(currentName ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => setValue(currentName ?? ""), [currentName]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed.length > 30) return;
    await supabase.from("profiles").upsert({ id: userId, display_name: trimmed });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={save} className="space-y-2">
      <Field label="Spelarnamn" value={value} onChange={setValue} maxLength={30} />
      <button type="submit" className="w-full rounded-2xl border border-border py-2 text-sm">
        {saved ? "Sparat!" : "Spara namn"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        required
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-primary"
      />
    </label>
  );
}
