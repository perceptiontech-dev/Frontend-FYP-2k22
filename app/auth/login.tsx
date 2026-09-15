"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

const SSUET_LOGO_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAw_Jy9oKpU48zPIiRFe5J9eDkOHLkxlx-moRd6vnn6lTW6gsK0U7BgBGmASmKvCNf03LEPRd6fX4R6FuigJrIyeIX8pveVxlpPy3skCeTXvfUkh8AHzHz-SuUbMosjCKJbahHrXnvP5OX0ucUUWBRp8e2IyREClansm0N-JRwzmtSazXzvnot2pWxcMhPKLIl5LBwz80Fh-UdW9DY1rhmiFgmNp1gR2qwyIU7dpGSzHXKu3Da7D4knlns4TylKkz1EVQ";

const LOGIN_BG_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBUcfuzqoc7xa5HCoU5vagHvDxtQKPUESyiKABV9F-TFfia0S9YlACDvOh1axb35ujr9qTkUgwvSmjcDDalN22sGcRqmgaWcMtqhKUhsKxaCMgeahQ84IIT1RrVKKc6Al1PTXJseHGavFPAfkPEc92bf820vL8ln9g6YkORRpbYcXPCACUwFj40p5Eks-zksf7puNfS01O0jD3B2M9PtsROb_s46BTikZbZ3LcrMjWC_W5bGOkveqNKwjImjwxayNW8FQ";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      return;
    }

    const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

    const routeByRole = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/v1/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          return;
        }

        const userInfo = await response.json();

        if (userInfo?.role === "admin") {
          router.replace("/dashboard");
        } else {
          router.replace("/facultydashboard");
        }
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }
    };

    routeByRole();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:8000";

      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.detail || "Login failed";

        throw new Error(
          typeof errorMessage === "string" ? errorMessage : "Login failed"
        );
      }

      const data = await response.json();

      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", data.access_token || "");
        localStorage.setItem("refresh_token", data.refresh_token || "");
      }

      const userInfoResponse = await fetch(`${baseUrl}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error(
          "Login succeeded but failed to load user profile"
        );
      }

      const userInfo = await userInfoResponse.json();

      if (userInfo?.role === "admin") {
        router.replace("/dashboard");
      } else {
        router.replace("/facultydashboard");
      }
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page-bg text-on-surface flex font-sans">
      {/* =====================================================
          LEFT SIDE — LOGIN
      ====================================================== */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center p-6 sm:p-8 relative overflow-hidden bg-[#F8FFFA]">

        {/* Background Image */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(
              rgba(248, 255, 250, 0.62),
              rgba(248, 255, 250, 0.62)
            ), url('${LOGIN_BG_URL}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* Very Light Overlay */}
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />

        {/* Main Content */}
        <div className="w-full max-w-md relative z-10 flex flex-col items-center">

          {/* University Logo */}
          <div className="flex flex-col items-center mb-8 sm:mb-10 text-center">
            <div className="w-24 h-24 rounded-full border-4 border-primary p-1 mb-4 bg-white shadow-md">
              <img
                alt="SSUET Logo"
                src={SSUET_LOGO_URL}
                className="w-full h-full object-contain rounded-full"
              />
            </div>

            <h1 className="font-headline text-[24px] leading-8 font-bold text-primary text-center tracking-tight">
              Sir Syed University
              <br />

              <span className="text-[20px] leading-7 font-normal text-on-surface-variant">
                of Engineering &amp; Technology
              </span>
            </h1>
          </div>

          {/* =================================================
              WHITE LOGIN CARD — NO GLASSMORPHISM
          ================================================== */}
          <div className="w-full bg-white p-7 sm:p-8 rounded-xl shadow-xl border border-gray-200">

            {/* Heading */}
            <div className="mb-8 text-center">
             <h2 className="text-[32px] leading-10 font-medium text-black mb-2 font-headline">
  Welcome Back
</h2>

              <p className="text-[14px] leading-5 text-on-surface-variant">
                Sign in to access the IntelliPaper dashboard.
              </p>
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={handleLogin}>

              {/* Email */}
              <div>
                <label
                  className="block text-sm font-semibold text-on-surface mb-1.5"
                  htmlFor="email"
                >
                  Email Address
                </label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 w-5 h-5" />

                  <input
                    id="email"
                    type="email"
                    placeholder="faculty@ssuet.edu.pk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 h-[44px] bg-white border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-sm text-on-surface placeholder:text-on-surface-variant/50"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-sm font-semibold text-on-surface mb-1.5"
                  htmlFor="password"
                >
                  Password
                </label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 w-5 h-5" />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-2.5 h-[44px] bg-white border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors text-sm text-on-surface placeholder:text-on-surface-variant/50"
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((s) => !s)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 hover:text-primary transition-colors flex items-center justify-center"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sign In */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[44px] bg-primary-container text-on-primary-container font-semibold text-sm rounded-lg hover:bg-primary hover:text-on-primary transition-all active:scale-[0.97] flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:active:scale-100"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-[18px] h-[18px]" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="mt-8 text-sm text-on-surface-variant/70 text-center">
            © 2024 SSUET. All rights reserved.
          </p>
        </div>
      </div>

      {/* =====================================================
          RIGHT SIDE — BRANDING
      ====================================================== */}
      <div className="hidden lg:flex w-1/2 min-h-screen bg-primary-container flex-col justify-center items-center relative overflow-hidden">

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-container via-primary to-on-primary-fixed-variant opacity-90 z-0" />

        {/* Decorative Circles */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-fixed rounded-full mix-blend-overlay blur-3xl opacity-30" />

        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-tertiary-fixed rounded-full mix-blend-overlay blur-3xl opacity-20" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-lg p-12 flex flex-col items-start justify-center">

          {/* Powered By */}
          <div className="flex items-center gap-3 mb-6 bg-surface/10 backdrop-blur-md px-4 py-2 rounded-full border border-surface/20">
            <Sparkles className="text-on-primary-container w-5 h-5" />

            <span className="text-xs font-bold text-on-primary-container tracking-wider uppercase">
              Powered by Perception Tech
            </span>
          </div>

          {/* Brand Heading */}
          <h2 className="text-[48px] leading-[1.2] font-extrabold text-on-primary-container mb-6 tracking-tight">
            IntelliPaper
            <br />

            <span className="text-surface text-[32px] leading-10 font-bold">
              Exam Moderation AI
            </span>
          </h2>

          {/* Description */}
          <p className="text-[18px] leading-7 text-surface-container-highest mb-12 max-w-md opacity-90">
            Streamlining academic assessment through intelligent, unbiased,
            and clinical moderation tools designed for higher education
            excellence.
          </p>

          {/* Illustration */}
          <div className="w-full relative rounded-2xl overflow-hidden shadow-2xl border border-surface/10 aspect-video group">

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />

            <div className="w-full h-full bg-surface-tint flex items-center justify-center relative overflow-hidden">

              {/* Decorative Lines */}
              <div className="absolute inset-0 opacity-20 flex flex-wrap gap-2 p-4">
                <div className="w-1/3 h-2 bg-surface rounded-full" />
                <div className="w-1/2 h-2 bg-surface rounded-full" />
                <div className="w-1/4 h-2 bg-surface rounded-full" />
                <div className="w-2/3 h-2 bg-surface rounded-full" />
                <div className="w-1/3 h-2 bg-surface rounded-full" />
              </div>

              <BookOpen className="w-20 h-20 text-surface z-20 group-hover:scale-110 transition-transform duration-700 ease-out" />

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-dashed border-primary-fixed rounded-full animate-spin-slow z-10 opacity-30" />
            </div>

            {/* System Online */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed opacity-75" />

                <span className="relative inline-flex rounded-full h-3 w-3 bg-tertiary-fixed" />
              </span>

              <span className="text-xs font-semibold tracking-wide text-surface">
                System Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
