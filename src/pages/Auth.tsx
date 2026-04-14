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
  const navigate = useNavigate();
  const { login, register, guestLogin } = useAuth();

  const validate = () => {
    const e: typeof errors = {};
    if (!email || !/\S+@\S+\.\S+/.test(email)) e.email = "Valid email required";
    if (!isLogin && (!username || username.length < 3)) e.username = "Min 3 characters";
    if (!password || password.length < 6) e.password = "Min 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    if (isLogin) login(email, password);
    else register(email, password);
    navigate("/home");
  };

  const handleGuest = () => {
    guestLogin();
    navigate("/home");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-0 w-full mecha-line" />
        <div className="absolute bottom-1/3 left-0 w-full mecha-line" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-6 z-10"
      >
        <div className="text-center space-y-1">
          <p className="font-display text-[10px] tracking-[0.3em] text-muted-foreground uppercase mb-2">Morneven Institute</p>
          <h2 className="font-display text-xl tracking-[0.15em] text-primary">
            {isLogin ? "LOGIN" : "REGISTER"}
          </h2>
          <div className="mecha-line w-24 mx-auto" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Min 6 characters"
            />
            {errors.password && <p className="text-xs text-destructive mt-1 font-body">{errors.password}</p>}
          </div>

          <button
            type="submit"
            className="w-full hud-border-sm py-2.5 bg-primary text-primary-foreground font-display text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-opacity"
          >
            {isLogin ? "Access" : "Register"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 mecha-line" />
          <span className="text-xs text-muted-foreground font-heading">OR</span>
          <div className="flex-1 mecha-line" />
        </div>

        <button
          onClick={handleGuest}
          className="w-full py-2.5 border border-border rounded-sm text-xs font-display tracking-[0.15em] text-muted-foreground hover:bg-muted transition-colors uppercase"
        >
          Guest Mode
        </button>

        <p className="text-center text-xs text-muted-foreground font-body">
          {isLogin ? "No account?" : "Already registered?"}{" "}
          <button onClick={() => { setIsLogin(!isLogin); setErrors({}); }} className="text-primary hover:underline">
            {isLogin ? "Register" : "Login"}
          </button>
        </p>

        <p className="text-center text-[10px] text-muted-foreground/50 font-body italic">
          Use email with "author" (e.g. author@test.com) for Author access
        </p>
      </motion.div>
    </div>
  );
}
