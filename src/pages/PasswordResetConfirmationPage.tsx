import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { confirmApprovedPasswordReset } from "@/services/accountApi";

export default function PasswordResetConfirmationPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (!email || !username || newPassword.length < 12 || confirmPassword !== newPassword) {
      setMessage("Complete every field and make sure both password fields match.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmApprovedPasswordReset({
        email: email.trim().toLowerCase(),
        username: username.trim(),
        newPassword,
        confirmPassword,
      });
      await login(email.trim().toLowerCase(), newPassword);
      navigate("/home");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Credential confirmation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md space-y-6 z-10"
      >
        <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 w-[250%] mecha-line opacity-60" />
        <div className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 w-[250%] mecha-line opacity-60" />

        <div className="text-center space-y-1">
          <p className="font-display text-[10px] tracking-[0.3em] text-muted-foreground uppercase mb-2">Morneven Institute</p>
          <h2 className="font-display text-xl tracking-[0.15em] text-primary">CREDENTIAL CONFIRMATION</h2>
          <div className="mecha-line w-32 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Use the same email, username, and approved replacement password from your reviewed request.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Username</label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Your personnel username"
            />
          </div>

          <div>
            <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Approved new password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full px-3 py-2 pr-10 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Approved replacement password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Confirm password</label>
            <div className="relative mt-1">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full px-3 py-2 pr-10 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Repeat the approved password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {message ? <p className="text-xs text-destructive font-body">{message}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full hud-border-sm py-2.5 bg-primary text-primary-foreground font-display text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity"
          >
            {submitting ? "Processing" : "Confirm Credentials"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground font-body">
          <Link to="/auth" className="text-primary hover:underline">
            Back to login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
