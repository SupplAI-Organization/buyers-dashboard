"use client";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { useState } from "react";
import Link from "next/link";
import router from "next/dist/shared/lib/router/router";

export default function LoginForm() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isNotRobot, setIsNotRobot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!isNotRobot) {
    alert("Please confirm you are not a robot");
    return;
  }

  if (!email || !password) {
    alert("Email and password are required");
    return;
  }

  // SIGN IN
  if (isLogin) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    // SUCCESS
    console.log("Logged in successfully");
    router.push("/dashboard")
    
  }

  // SIGN UP
  else {
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    console.log("Signup successful", data);

    alert("Account created! Please log in.");
    setIsLogin(true);
  }
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F7F9] to-white flex">
      {/* Left side - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative"
        style={{
          backgroundImage: "url('/login/Loginpage.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-white/60"></div>

        <Link
          href="/"
          className="relative z-10 flex items-center text-3xl font-bold text-gray-900"
        >
          <img
            src="/landing/SupplAI_logo.jpg"
            alt="SupplAI Logo"
            className="absolute -left-7 h-28 w-28 object-contain"
          />
          <span className="ml-12">
            Suppl<span className="text-[#EA7B7B]">AI</span>
          </span>
        </Link>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Simplify your procurement journey
          </h1>
          <p className="text-gray-700 text-lg font-medium max-w-md">
            Connect with verified suppliers, compare specifications, and
            streamline your raw material sourcing.
          </p>
        </div>

        <p className="relative z-10 text-gray-600 text-sm font-medium">
          © 2026 SupplAI. All rights reserved.
        </p>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <Link
              href="/"
              className="inline-flex items-center text-2xl font-bold text-gray-900"
            >
              Suppl<span className="text-[#EA7B7B]">AI</span>
            </Link>
          </div>

          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              {isLogin ? "Welcome back" : "Create an account"}
            </h2>
            <p className="mt-2 text-gray-600">
              {isLogin
                ? "Sign in to access your dashboard"
                : "Get started with SupplAI today"}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex bg-gray-100 rounded-full p-1">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
                isLogin
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
                !isLogin
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-gray-700 font-medium">
                Continue with Google
              </span>
            </button>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#00A4EF" d="M11.4 24H0V12.6h11.4V24z" />
                <path fill="#FFB900" d="M24 24H12.6V12.6H24V24z" />
                <path fill="#F25022" d="M11.4 11.4H0V0h11.4v11.4z" />
                <path fill="#7FBA00" d="M24 11.4H12.6V0H24v11.4z" />
              </svg>
              <span className="text-gray-700 font-medium">
                Continue with Microsoft
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                or continue with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#EA7B7B] focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#EA7B7B] focus:border-transparent outline-none transition-all"
              />
            </div>

            {!isLogin && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#EA7B7B] focus:border-transparent outline-none transition-all"
                />
              </div>
            )}

            {/* I'm not a robot checkbox */}
            <div className="border border-gray-300 rounded-xl p-4 bg-gray-50">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isNotRobot}
                    onChange={(e) => setIsNotRobot(e.target.checked)}
                    className="sr-only peer"
                    required
                  />
                  <div className="w-6 h-6 border-2 border-gray-400 rounded peer-checked:border-[#EA7B7B] peer-checked:bg-[#EA7B7B] transition-all flex items-center justify-center">
                    {isNotRobot && (
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-gray-700">I&apos;m not a robot</span>
                <div className="ml-auto">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
              </label>
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <a
                  href="#"
                  className="text-sm text-[#EA7B7B] hover:text-[#d96a6a] font-medium"
                >
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#EA7B7B] hover:bg-[#d96a6a] text-white py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-[#EA7B7B]/25"
            >
              {isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Footer text */}
          <p className="text-center text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#EA7B7B] hover:text-[#d96a6a] font-medium"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
