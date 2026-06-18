import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useLogin } from "@/hooks/useLogin";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    await login(data);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col items-center mb-6" dir="ltr">
        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg mb-3">
          <img
            src="/logo.jpeg"
            alt="Noor Ul-Falah"
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-base font-bold text-gray-900 mb-1 text-center">
          Noor Ul-Falah
        </h1>
        <p className="text-gray-600 text-base text-center">Management Information System</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="email" className="text-gray-700 font-medium text-base block text-left" dir="ltr">
            Email
          </Label>
          <div className="relative" dir="ltr">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className={`pl-10 h-10 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""
              }`}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-base text-red-500" dir="ltr">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="password" className="text-gray-700 font-medium text-base block text-left" dir="ltr">
            Password
          </Label>
          <div className="relative" dir="ltr">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className={`pl-10 pr-10 h-10 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                errors.password ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""
              }`}
              {...register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-100 rounded-lg"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
            </Button>
          </div>
          {errors.password && (
            <p className="text-base text-red-500" dir="ltr">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-primary hover:bg-primary-hover text-white font-semibold h-10 rounded-lg transition-all shadow-sm hover:shadow-md mt-4"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="mt-4 text-center" dir="ltr">
        <Button
          variant="link"
          className="p-0 h-auto text-base text-primary hover:text-primary-hover font-medium"
          type="button"
        >
          Forgot password?
        </Button>
      </div>
    </div>
  );
};
