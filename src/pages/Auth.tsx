import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();

  const validate = () => {
    const e: typeof errors = {};
    if (!email || !/\S+@\S+\.\S+/.test(email)) e.email = "Valid email required";
    if (!password || password.length < 6) e.password = "Min 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (validate()) navigate("/home");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-1">
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
              className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-md text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-card border border-border rounded-md text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
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
          onClick={() => navigate("/home")}
          className="w-full py-2.5 border border-border rounded-md text-xs font-display tracking-[0.15em] text-muted-foreground hover:bg-muted transition-colors uppercase"
        >
          Guest Mode
        </button>

        <p className="text-center text-xs text-muted-foreground font-body">
          {isLogin ? "No account?" : "Already registered?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline">
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
