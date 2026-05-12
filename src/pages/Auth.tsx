import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { requestPasswordReset, submitPasswordResetRequest } from "@/services/accountApi";

type ForgotView = "options" | "email" | "request";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotView, setForgotView] = useState<ForgotView | null>(null);
  const [requestNewPassword, setRequestNewPassword] = useState("");
  const [requestConfirmPassword, setRequestConfirmPassword] = useState("");
  const [identityProof, setIdentityProof] = useState("");
  const [showRequestPassword, setShowRequestPassword] = useState(false);
  const [showRequestConfirmPassword, setShowRequestConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; username?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login, register, guestLogin } = useAuth();

  const resetForgotState = () => {
    setForgotView(null);
    setRequestNewPassword("");
    setRequestConfirmPassword("");
    setIdentityProof("");
  };

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!email || !/\S+@\S+\.\S+/.test(email)) nextErrors.email = "Valid email required";
    if (!isLogin && (!username || username.length < 3)) nextErrors.username = "Min 3 characters";
    if (!password || password.length < (isLogin ? 1 : 12)) {
      nextErrors.password = isLogin ? "Password required" : "Min 12 characters";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isLogin) await login(email, password);
      else await register(email, password, username);
      navigate("/home");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuest = async () => {
    setFormError("");
    setSubmitting(true);
    try {
      await guestLogin();
      navigate("/home");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Guest access failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPasswordEmail = async () => {
    setFormError("");
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErrors((current) => ({ ...current, email: "Enter your email first" }));
      return;
    }
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setFormError("Password reset instructions were requested. Check your email if the account exists.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Password reset request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordResetRequest = async () => {
    setFormError("");
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setFormError("Email akun wajib diisi.");
      return;
    }
    if (!username || username.trim().length < 3) {
      setFormError("Username akun wajib diisi.");
      return;
    }
    if (requestNewPassword.length < 12) {
      setFormError("Password baru minimal 12 karakter.");
      return;
    }
    if (requestConfirmPassword !== requestNewPassword) {
      setFormError("Konfirmasi password baru tidak cocok.");
      return;
    }
    if (identityProof.trim().length < 12) {
      setFormError("Bukti identitas personel wajib diisi lebih lengkap.");
      return;
    }

    setSubmitting(true);
    try {
      await submitPasswordResetRequest({
        email: email.trim().toLowerCase(),
        username: username.trim(),
        newPassword: requestNewPassword,
        confirmPassword: requestConfirmPassword,
        identityProof: identityProof.trim(),
      });
      setFormError("Request password reset berhasil dikirim. Tunggu review admin atau author lalu gunakan halaman credential confirmation.");
      resetForgotState();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Password reset request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-sm space-y-6 z-10"
      >
        <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 w-[285%] mecha-line opacity-60" />
        <div className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 w-[285%] mecha-line opacity-60" />

        <div className="text-center space-y-1">
          <p className="font-display text-[10px] tracking-[0.3em] text-muted-foreground uppercase mb-2">Morneven Institute</p>
          <h2 className="font-display text-xl tracking-[0.15em] text-primary">
            {isLogin ? "LOGIN" : "REGISTER"}
          </h2>
          <div className="mecha-line w-24 mx-auto" />
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="your@email.com"
            />
            {errors.email ? <p className="text-xs text-destructive mt-1 font-body">{errors.email}</p> : null}
          </div>

          {!isLogin ? (
            <div>
              <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Username</label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Choose a username"
              />
              {errors.username ? <p className="text-xs text-destructive mt-1 font-body">{errors.username}</p> : null}
            </div>
          ) : null}

          <div>
            <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-3 py-2 pr-10 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={isLogin ? "Password" : "Min 12 characters"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? <p className="text-xs text-destructive mt-1 font-body">{errors.password}</p> : null}
            {isLogin ? (
              <button
                type="button"
                onClick={() => setForgotView((current) => (current ? null : "options"))}
                disabled={submitting}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            ) : null}
          </div>

          {isLogin && forgotView ? (
            <div className="space-y-4 rounded-sm border border-border bg-card/80 p-4">
              {forgotView === "options" ? (
                <div className="space-y-3">
                  <p className="text-xs font-heading tracking-wider text-muted-foreground uppercase">Forgot Password Options</p>
                  <button
                    type="button"
                    onClick={() => setForgotView("email")}
                    className="w-full rounded-sm border border-border px-3 py-2 text-left text-sm text-foreground hover:border-primary/60 hover:bg-muted/40"
                  >
                    Reset password via email
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotView("request")}
                    className="w-full rounded-sm border border-border px-3 py-2 text-left text-sm text-foreground hover:border-primary/60 hover:bg-muted/40"
                  >
                    Request password reset
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/auth/password-reset/confirm")}
                    className="w-full rounded-sm border border-border px-3 py-2 text-left text-sm text-foreground hover:border-primary/60 hover:bg-muted/40"
                  >
                    Already send a request
                  </button>
                </div>
              ) : null}

              {forgotView === "email" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Gunakan email akun yang sama. Jika akun ditemukan, sistem akan memproses permintaan reset via email.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleForgotPasswordEmail}
                      disabled={submitting}
                      className="flex-1 hud-border-sm py-2 bg-primary text-primary-foreground font-display text-[11px] tracking-[0.18em] uppercase hover:opacity-90"
                    >
                      {submitting ? "Processing" : "Request Email Reset"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotView("options")}
                      className="px-3 py-2 border border-border rounded-sm text-xs text-muted-foreground hover:bg-muted/40"
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : null}

              {forgotView === "request" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Isi identitas personel dengan informasi yang hanya diketahui pemilik akun, misalnya track, clearance, jabatan, tim aktif, dan konteks tugas terakhir.
                  </p>
                  <div>
                    <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Username akun</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Account username"
                    />
                  </div>
                  <div>
                    <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Password baru</label>
                    <div className="relative mt-1">
                      <input
                        type={showRequestPassword ? "text" : "password"}
                        value={requestNewPassword}
                        onChange={(event) => setRequestNewPassword(event.target.value)}
                        className="w-full px-3 py-2 pr-10 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Min 12 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRequestPassword((value) => !value)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                      >
                        {showRequestPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Konfirmasi password baru</label>
                    <div className="relative mt-1">
                      <input
                        type={showRequestConfirmPassword ? "text" : "password"}
                        value={requestConfirmPassword}
                        onChange={(event) => setRequestConfirmPassword(event.target.value)}
                        className="w-full px-3 py-2 pr-10 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Repeat new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRequestConfirmPassword((value) => !value)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                      >
                        {showRequestConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Bukti identitas personel</label>
                    <textarea
                      value={identityProof}
                      onChange={(event) => setIdentityProof(event.target.value)}
                      className="w-full mt-1 min-h-[120px] px-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Contoh: Track GOV, clearance L4, leader tim X, tugas terakhir Y, dan identitas internal lain yang relevan."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handlePasswordResetRequest}
                      disabled={submitting}
                      className="flex-1 hud-border-sm py-2 bg-primary text-primary-foreground font-display text-[11px] tracking-[0.18em] uppercase hover:opacity-90"
                    >
                      {submitting ? "Processing" : "Send Request"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotView("options")}
                      className="px-3 py-2 border border-border rounded-sm text-xs text-muted-foreground hover:bg-muted/40"
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {formError ? <p className="text-xs text-destructive font-body">{formError}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full hud-border-sm py-2.5 bg-primary text-primary-foreground font-display text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity"
          >
            {submitting ? "Processing" : isLogin ? "Access" : "Register"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 mecha-line" />
          <span className="text-xs text-muted-foreground font-heading">OR</span>
          <div className="flex-1 mecha-line" />
        </div>

        <button
          onClick={handleGuest}
          disabled={submitting}
          className="w-full py-2.5 border border-border rounded-sm text-xs font-display tracking-[0.15em] text-muted-foreground hover:bg-muted transition-colors uppercase"
        >
          Guest Mode
        </button>

        <p className="text-center text-xs text-muted-foreground font-body">
          {isLogin ? "No account?" : "Already registered?"}{" "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors({});
              setFormError("");
              resetForgotState();
            }}
            className="text-primary hover:underline"
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </p>

        {isLogin ? (
          <p className="text-center text-xs text-muted-foreground font-body">
            <Link to="/auth/password-reset/confirm" className="text-primary hover:underline">
              Already send a request
            </Link>
          </p>
        ) : null}
      </motion.div>
    </div>
  );
}
