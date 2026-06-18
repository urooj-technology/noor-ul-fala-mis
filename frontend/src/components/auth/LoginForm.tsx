// components/LoginForm.tsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { applyUserCalendarPreference } from '@/contexts/CalendarContext';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import useAdd from "@/api/useAdd";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Define the User interface to match the expected user object structure
  interface User {
    id: string;
    username: string;
    email: string;
    name: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    address?: string;
    profile_picture?: string;
    role: "admin" | "staff" | "customer" | "vendor" | "user";
    is_buyer: boolean;
    is_seller: boolean;
    is_finance: boolean;
    is_admin: boolean;
    is_active: boolean;
    is_staff: boolean;
    permissions?: string[];
    created_at: string;
    updated_at: string;
    token: string;
  }

export const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuth();

  // Use the useAdd hook for login API call
  const { handleAdd, loading, responseData } = useAdd<any>({
    queryKey: "login",
    endpoint: "login/",
    customSuccessMessage: "Login successful!",
    customErrorMessage: "Login failed. Please check your credentials.",
  });

  // Handle successful login response
  React.useEffect(() => {
    if (responseData) {
      // Transform the API response to match our User interface
      // Backend sends: { token: "...", user: { id, username, email, role, ... } }
      const userData: User = {
        id: responseData.user?.id?.toString() || "1",
        username: responseData.user?.username || "",
        email: responseData.user?.email || "",
        name: `${responseData.user?.first_name || ""} ${responseData.user?.last_name || ""}`.trim() || responseData.user?.username || "User",
        first_name: responseData.user?.first_name || "",
        last_name: responseData.user?.last_name || "",
        phone: responseData.user?.phone || "",
        address: responseData.user?.address || "",
        profile_picture: responseData.user?.profile_picture || "",
        role: responseData.user?.role || (responseData.user?.is_admin ? "admin" : "staff"),
        is_buyer: responseData.user?.is_buyer || false,
        is_seller: responseData.user?.is_seller || false,
        is_finance: responseData.user?.is_finance || false,
        is_admin: responseData.user?.is_admin || false,
        is_active: responseData.user?.is_active || true,
        is_staff: responseData.user?.is_staff || false,
        permissions: responseData.user?.permissions || [],
        created_at: responseData.user?.created_at || "",
        updated_at: responseData.user?.updated_at || "",
        token: responseData.token || "",
      };
      
      // Apply calendar preference before redirect
      if (responseData.user?.preferred_calendar) {
        applyUserCalendarPreference(responseData.user.preferred_calendar);
      }

      // Set the user in the auth context (which handles localStorage)
      setUser(userData);
      
      // Redirect immediately to dashboard
      window.location.replace("/");
    }
  }, [responseData, setUser]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Use the handleAdd function from useAdd to perform login
      handleAdd(data);
    } catch (error) {
      // Error is handled by the useAdd hook
      console.error("Login error:", error);
    }
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
