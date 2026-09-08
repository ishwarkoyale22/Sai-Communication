import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Phone, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

const PHONE_RE = /^[6-9]\d{9}$/;

// ── Login ──
const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your email or mobile number"),
  password: z.string().min(1, "Enter your password"),
});
type LoginValues = z.infer<typeof loginSchema>;

// ── Signup ──
const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name"),
    phone: z.string().regex(PHONE_RE, "Enter a valid 10-digit mobile number"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type SignupValues = z.infer<typeof signupSchema>;

type Mode = "login" | "signup";

export function AuthDialog({ open, onOpenChange, defaultMode = "login" }: { open: boolean; onOpenChange: (v: boolean) => void; defaultMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(defaultMode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "Track orders, save addresses and check out faster."
              : "Join Sai Communication to track orders and save your details."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Create Account</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-4">
            <LoginForm onSuccess={() => onOpenChange(false)} onSwitchToSignup={() => setMode("signup")} />
          </TabsContent>
          <TabsContent value="signup" className="mt-4">
            <SignupForm onSuccess={() => onOpenChange(false)} onSwitchToLogin={() => setMode("login")} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function LoginForm({ onSuccess, onSwitchToSignup }: { onSuccess: () => void; onSwitchToSignup: () => void }) {
  const { signInWithEmail, signInWithPhone, sendPasswordReset } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    const isEmail = values.identifier.includes("@");
    const isPhone = PHONE_RE.test(values.identifier.trim());
    if (!isEmail && !isPhone) {
      setError("identifier", { message: "Enter a valid email address or 10-digit mobile number" });
      return;
    }
    const { error } = isEmail
      ? await signInWithEmail(values.identifier.trim(), values.password)
      : await signInWithPhone(values.identifier.trim(), values.password);

    if (error) {
      toast.error(error === "Invalid login credentials" ? "Incorrect email/mobile number or password." : error);
      return;
    }
    toast.success("Welcome back!");
    onSuccess();
  }

  async function handleForgotPassword() {
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      toast.error("Enter your account email to reset your password.");
      return;
    }
    setForgotSending(true);
    const { error } = await sendPasswordReset(forgotEmail.trim());
    setForgotSending(false);
    if (error) { toast.error(error); return; }
    toast.success("Password reset link sent — check your email.");
    setForgotOpen(false);
  }

  if (forgotOpen) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Enter the email on your account and we'll send you a reset link.</p>
        <div className="space-y-2">
          <Label htmlFor="forgot-email">Email address</Label>
          <Input id="forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <Button className="w-full" onClick={handleForgotPassword} disabled={forgotSending}>
          {forgotSending ? "Sending..." : "Send reset link"}
        </Button>
        <button type="button" onClick={() => setForgotOpen(false)} className="text-xs font-semibold text-primary hover:underline">
          ← Back to login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-identifier">Email or Mobile Number</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Mail className="size-4" />
          </span>
          <Input id="login-identifier" className="pl-9" placeholder="you@example.com or 9876543210" {...register("identifier")} />
        </div>
        {errors.identifier && <p className="text-xs text-destructive-foreground">{errors.identifier.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <button type="button" onClick={() => setForgotOpen(true)} className="text-xs font-semibold text-primary hover:underline">
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Lock className="size-4" />
          </span>
          <Input id="login-password" type={showPassword ? "text" : "password"} className="pl-9 pr-9" placeholder="Your password" {...register("password")} />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive-foreground">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Login"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        New here?{" "}
        <button type="button" onClick={onSwitchToSignup} className="font-semibold text-primary hover:underline">
          Create an account
        </button>
      </p>
    </form>
  );
}

function SignupForm({ onSuccess, onSwitchToLogin }: { onSuccess: () => void; onSwitchToLogin: () => void }) {
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupValues) {
    const { error, needsEmailConfirmation } = await signUp(values);
    if (error) { toast.error(error); return; }
    if (needsEmailConfirmation) {
      toast.success("Account created! Check your email to confirm your address, then log in.");
    } else {
      toast.success("Account created — you're signed in.");
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full Name</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><UserIcon className="size-4" /></span>
          <Input id="signup-name" className="pl-9" placeholder="Your full name" {...register("fullName")} />
        </div>
        {errors.fullName && <p className="text-xs text-destructive-foreground">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-phone">Mobile Number</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Phone className="size-4" /></span>
          <Input id="signup-phone" type="tel" className="pl-9" placeholder="10-digit mobile number" {...register("phone")} />
        </div>
        {errors.phone && <p className="text-xs text-destructive-foreground">{errors.phone.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">Email Address</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Mail className="size-4" /></span>
          <Input id="signup-email" type="email" className="pl-9" placeholder="you@example.com" {...register("email")} />
        </div>
        {errors.email && <p className="text-xs text-destructive-foreground">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock className="size-4" /></span>
          <Input id="signup-password" type={showPassword ? "text" : "password"} className="pl-9 pr-9" placeholder="At least 6 characters" {...register("password")} />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive-foreground">{errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-confirm">Confirm Password</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Lock className="size-4" /></span>
          <Input id="signup-confirm" type={showConfirm ? "text" : "password"} className="pl-9 pr-9" placeholder="Re-enter your password" {...register("confirmPassword")} />
          <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showConfirm ? "Hide password" : "Show password"}>
            {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-xs text-destructive-foreground">{errors.confirmPassword.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create Account"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <button type="button" onClick={onSwitchToLogin} className="font-semibold text-primary hover:underline">
          Login
        </button>
      </p>
    </form>
  );
}
