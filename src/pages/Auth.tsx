import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; username?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login, register, guestLogin } = useAuth();

  const validate = () => {
    const e: typeof errors = {};
    if (!email || !/\S+@\S+\.\S+/.test(email)) e.email = "Valid email required";
    if (!isLogin && (!username || username.length < 3)) e.username = "Min 3 characters";
    if (!password || password.length < (isLogin ? 1 : 12)) {
      e.password = isLogin ? "Password required" : "Min 12 characters";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
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
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="your@email.com"
            />
            {errors.email && <p className="text-xs text-destructive mt-1 font-body">{errors.email}</p>}
          </div>

          {!isLogin && (
            <div>
              <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Choose a username"
              />
              {errors.username && <p className="text-xs text-destructive mt-1 font-body">{errors.username}</p>}
            </div>
          )}

          <div>
            <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={isLogin ? "Password" : "Min 12 characters"}
            />
            {errors.password && <p className="text-xs text-destructive mt-1 font-body">{errors.password}</p>}
          </div>

          {formError && <p className="text-xs text-destructive font-body">{formError}</p>}

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
          <button onClick={() => { setIsLogin(!isLogin); setErrors({}); setFormError(""); }} className="text-primary hover:underline">
            {isLogin ? "Register" : "Login"}
          </button>
        </p>

      </motion.div>
    </div>
  );
}
