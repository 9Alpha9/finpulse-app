"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import { Sun, Moon, Lock, Mail, User, Eye, EyeOff, Loader2, CheckSquare, Square } from "lucide-react";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const router = useRouter();
  const { user, register, theme, toggleTheme, isLoading } = useThemeAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!name || !email || !password || !confirmPassword) {
      setError("Semua field wajib diisi");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Format email tidak valid");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      return;
    }

    if (!agreeTerms) {
      setError("Anda harus menyetujui Syarat dan Ketentuan");
      return;
    }

    setIsSubmitting(true);
    // Simulate API request delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const success = register(email, name);
    setIsSubmitting(false);
    
    if (success) {
      router.push("/");
    } else {
      setError("Pendaftaran gagal. Silakan coba lagi.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-screen bg-background overflow-hidden">
      {/* Light/Dark Toggle (Floating) */}
      <div className="absolute right-4 top-4 z-50">
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted shadow-sm transition-all duration-200"
          aria-label="Toggle Theme"
        >
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>
      </div>

      {/* Left Section (Visual Banner) - Hidden on Mobile */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-zinc-950 p-12 text-white lg:flex">
        {/* Background Image / Overlay */}
        <div className="absolute inset-0 z-0 opacity-50 bg-blend-multiply bg-black">
          <Image
            src="/login_visual.png"
            alt="Financial visual"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent z-10" />

        {/* Content */}
        <div className="relative z-20 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 font-bold text-white shadow-lg">
            A
          </div>
          <span className="text-xl font-bold tracking-tight text-white">ArthaVerse</span>
        </div>

        <div className="relative z-20 mt-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md"
          >
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
              Bergabung Bersama Jutaan Pengguna ArthaVerse.
            </h2>
            <p className="mt-4 text-zinc-300 text-sm md:text-base leading-relaxed">
              Mulai kelola aset, kurangi liabilitas, dan bangun tabungan otomatis hari ini. Dapatkan akses penuh ke dasbor finansial premium secara instan.
            </p>
          </motion.div>
          
          <div className="mt-8 border-t border-zinc-800 pt-6 flex items-center justify-between text-xs text-zinc-400">
            <span>&copy; 2026 ArthaVerse. Hak Cipta Dilindungi.</span>
            <span className="flex gap-4">
              <a href="#" className="hover:text-white transition">Privasi</a>
              <a href="#" className="hover:text-white transition">Syarat & Ketentuan</a>
            </span>
          </div>
        </div>
      </div>

      {/* Right Section (Register Form) */}
      <div className="flex w-full flex-col justify-center bg-card px-6 py-12 lg:w-1/2 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 lg:hidden mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-green font-bold text-white">
              A
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">ArthaVerse</span>
          </div>

          <div className="text-left">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Buat Akun Baru
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Mulai perjalanan kemandirian finansial Anda bersama ArthaVerse.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-lg bg-destructive/15 p-3 text-xs text-destructive font-medium border border-destructive/20"
            >
              {error}
            </motion.div>
          )}

          <div className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Lengkap Anda"
                    className="block w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="block w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="block w-full rounded-lg border border-border bg-background py-2 pl-10 pr-10 text-sm placeholder:text-muted-foreground focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password"
                    className="block w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green transition-all"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 py-1">
                <button
                  type="button"
                  onClick={() => setAgreeTerms(!agreeTerms)}
                  className="mt-0.5 text-brand-green hover:text-opacity-80 transition-colors"
                >
                  {agreeTerms ? (
                    <CheckSquare className="h-4.5 w-4.5" />
                  ) : (
                    <Square className="h-4.5 w-4.5 text-muted-foreground" />
                  )}
                </button>
                <span className="text-xs text-muted-foreground leading-normal">
                  Saya menyetujui{" "}
                  <a href="#" className="font-semibold text-brand-green hover:underline">
                    Syarat Layanan
                  </a>{" "}
                  dan{" "}
                  <a href="#" className="font-semibold text-brand-green hover:underline">
                    Kebijakan Privasi
                  </a>{" "}
                  ArthaVerse.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-lg bg-brand-green py-2.5 px-4 text-sm font-semibold text-white hover:bg-opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Membuat Akun...
                  </>
                ) : (
                  "Buat Akun"
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-semibold text-brand-green hover:underline"
              >
                Masuk ke Akun
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
