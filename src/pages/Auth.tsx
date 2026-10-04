/**
 * Auth.tsx — fixes applied:
 * 
 * 1. SECURITY: Removed hardcoded ADMIN_PASSWORD from client bundle.
 *    Admin role is now granted via a Supabase Edge Function that verifies
 *    a secret server-side. Until you set that up, admin signup is simply
 *    disabled on the client — the has_role() RPC still gates all admin
 *    actions server-side, so this is safe.
 * 
 * 2. ADDED: "Forgot password?" flow using supabase.auth.resetPasswordForEmail()
 * 
 * 3. ADDED: Better error messages for common Supabase auth errors
 * 
 * 4. FIXED: New users now get a default "buyer" role inserted into user_roles
 *    immediately after signup so their roles array is never empty.
 */
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Mail, Lock, User, Loader, Eye, EyeOff, ArrowLeft } from "lucide-react";

type AuthView = "login" | "signup" | "forgot";

export function Auth() {
  const [view, setView] = React.useState<AuthView>("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const reset = () => {
    setError(null);
    setMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    reset();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    reset();
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { name },
        },
      });
      if (error) throw error;

      // ── Assign a default "buyer" role so the new user's roles array is
      // never empty. Without this, fetchRoles() returns [] and the user
      // can't access any role-gated UI until an admin manually grants one.
      //
      // Best-effort: a Supabase database trigger on auth.users INSERT is
      // the more robust alternative (runs even if this client call fails),
      // but this covers the common case with no extra infrastructure.
      if (data.user) {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: "buyer" });
        if (roleErr) {
          // Non-fatal — log for debugging but don't block the signup flow.
          console.warn("Could not assign default buyer role:", roleErr.message);
        }
      }

      setMessage("Account created! Check your email to confirm, then log in.");
      setView("login");
    } catch (err: any) {
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setLoading(true);
    reset();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      setMessage("Password reset link sent — check your email.");
    } catch (err: any) {
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-start justify-center p-4 overflow-y-auto py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 pt-4">
          <div className="inline-flex items-center gap-2 text-3xl font-bold text-foreground mb-2">
            <MapPin className="text-primary" size={32} />
            TerraMap
          </div>
          <p className="text-muted-foreground">Land Registry Platform</p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">

          {/* ── Forgot password view ── */}
          {view === "forgot" && (
            <>
              <button
                onClick={() => { setView("login"); reset(); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition"
              >
                <ArrowLeft size={16} /> Back to login
              </button>
              <h2 className="text-2xl font-bold text-card-foreground mb-2">Reset password</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and we'll send a reset link.
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Field label="Email">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                      type="email" required
                      className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </Field>
                {error && <ErrorBox>{error}</ErrorBox>}
                {message && <SuccessBox>{message}</SuccessBox>}
                <SubmitButton loading={loading}>Send reset link</SubmitButton>
              </form>
            </>
          )}

          {/* ── Login / Signup tabs ── */}
          {view !== "forgot" && (
            <>
              <div className="flex gap-2 mb-6">
                {(["login", "signup"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => { setView(v); reset(); }}
                    className={`flex-1 py-2.5 rounded-xl font-bold transition capitalize ${
                      view === v
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {v === "login" ? "Login" : "Sign Up"}
                  </button>
                ))}
              </div>

              {error && <ErrorBox>{error}</ErrorBox>}
              {message && <SuccessBox>{message}</SuccessBox>}

              {/* Login form */}
              {view === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <Field label="Email">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input
                        type="email" required
                        className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </Field>
                  <Field label="Password">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input
                        type={showPassword ? "text" : "password"} required
                        className="w-full pl-10 pr-12 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </Field>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setView("forgot"); reset(); }}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <SubmitButton loading={loading}>Login</SubmitButton>
                </form>
              )}

              {/* Signup form */}
              {view === "signup" && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <Field label="Full Name">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input
                        type="text" required
                        className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted"
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </Field>
                  <Field label="Email">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input
                        type="email" required
                        className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </Field>
                  <Field label="Password">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input
                        type={showPassword ? "text" : "password"} required minLength={6}
                        className="w-full pl-10 pr-12 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none bg-muted"
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </Field>
                  <SubmitButton loading={loading}>Create Account</SubmitButton>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small reusable pieces ─────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-card-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading && <Loader className="animate-spin" size={18} />}
      {children}
    </button>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
      {children}
    </div>
  );
}

function SuccessBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-xl text-sm">
      {children}
    </div>
  );
}

function friendlyError(msg: string): string {
  if (msg.includes("User already registered")) return "This email is already registered. Try logging in.";
  if (msg.includes("Invalid login credentials")) return "Incorrect email or password.";
  if (msg.includes("Email not confirmed")) return "Please confirm your email before logging in.";
  if (msg.includes("Password should be")) return "Password must be at least 6 characters.";
  if (msg.includes("Unable to validate email")) return "Please enter a valid email address.";
  if (msg.includes("rate limit")) return "Too many attempts — please wait a moment and try again.";
  return msg;
}
