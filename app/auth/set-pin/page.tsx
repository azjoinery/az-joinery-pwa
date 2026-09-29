"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store/auth";
import { landingPageForRole } from "@/lib/roles";
import { api } from "@/lib/api/client";
import { LogoMark } from "@/lib/components/Brand";

type Step = "camera" | "pin" | "confirm";

export default function SetPinPage() {
  const router = useRouter();
  const { user, me } = useAuth();
  const [step, setStep] = useState<Step>("camera");
  const [photoUrl, setPhotoUrl] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (user && user.pinSet !== false) {
      router.replace(landingPageForRole(user.role));
    }
  }, [user, router]);

  useEffect(() => {
    if (step === "camera") startCamera();
    return () => stopCamera();
  }, [step]);

  const startCamera = async () => {
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const snap = () => {
    const video = videoRef.current;
    if (!video) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    // mirror the selfie (front camera is mirrored in preview)
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      video,
      (video.videoWidth - size) / 2, (video.videoHeight - size) / 2,
      size, size,
      0, 0, size, size
    );
    setPhotoUrl(canvas.toDataURL("image/jpeg", 0.82));
    stopCamera();
    setStep("pin");
  };

  const skipCamera = () => {
    stopCamera();
    setStep("pin");
  };

  const pressPin = (d: string) => {
    if (step === "pin") {
      const next = (pin + d).slice(0, 6);
      setPin(next);
      if (next.length === 6) setStep("confirm");
    } else {
      const next = (confirmPin + d).slice(0, 6);
      setConfirmPin(next);
      if (next.length === 6) submit(next);
    }
  };

  const del = () => {
    if (step === "pin") setPin((p) => p.slice(0, -1));
    else setConfirmPin((p) => p.slice(0, -1));
  };

  const submit = async (finalConfirm: string) => {
    if (finalConfirm !== pin) {
      setError("PINs don't match — try again");
      setConfirmPin("");
      setStep("pin");
      setPin("");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/auth/set-pin", { pin });
      if (photoUrl) await api.patch(`/users/${user.id}`, { photoUrl });
      await me();
      router.replace(landingPageForRole(user.role));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Something went wrong — try again");
      setConfirmPin("");
      setStep("pin");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  };

  const dots = (val: string) => (
    <div className="flex justify-center gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`h-4 w-4 rounded-full border-2 transition-colors ${
          i < val.length ? "border-brand-orange bg-brand-orange" : "border-white/30 bg-transparent"
        }`} />
      ))}
    </div>
  );

  const numPad = (
    <div className="grid grid-cols-3 gap-3">
      {["1","2","3","4","5","6","7","8","9"].map((d) => (
        <button key={d} type="button" onClick={() => pressPin(d)} disabled={submitting}
          className="flex h-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 font-heading text-2xl font-semibold text-white transition-colors hover:bg-white/20 active:bg-white/30 disabled:opacity-40">
          {d}
        </button>
      ))}
      <div />
      <button type="button" onClick={() => pressPin("0")} disabled={submitting}
        className="flex h-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 font-heading text-2xl font-semibold text-white transition-colors hover:bg-white/20 active:bg-white/30 disabled:opacity-40">
        0
      </button>
      <button type="button" onClick={del} disabled={submitting}
        className="flex h-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white/70 transition-colors hover:bg-white/20 active:bg-white/30 disabled:opacity-30">
        <span className="text-xl">⌫</span>
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 py-10">
      <div className="w-full max-w-[380px] space-y-6">

        <div className="flex justify-center">
          <LogoMark size={44} plaque />
        </div>

        {step === "camera" && (
          <>
            <div className="text-center">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-white">
                Hi {user?.name?.split(" ")[0] ?? "there"}
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Take a quick selfie — it saves straight to your profile so the team can recognise you.
              </p>
            </div>

            {cameraError ? (
              <div className="rounded-3xl bg-white/5 border border-white/10 p-8 text-center space-y-2">
                <p className="text-white/60 text-sm">Camera not available on this device.</p>
                <button onClick={skipCamera} className="text-brand-orange text-sm font-medium hover:text-orange-400">
                  Skip and set PIN →
                </button>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-3xl bg-black aspect-square">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute inset-0 rounded-3xl ring-2 ring-inset ring-white/10 pointer-events-none" />
              </div>
            )}

            {!cameraError && (
              <div className="space-y-3">
                <button onClick={snap}
                  className="w-full py-3 rounded-2xl bg-brand-orange text-white font-semibold text-lg hover:bg-orange-600 active:scale-[0.98] transition-transform">
                  Take photo
                </button>
                <button onClick={skipCamera} className="w-full text-center text-sm text-white/40 hover:text-white/60">
                  Skip — I'll add a photo later
                </button>
              </div>
            )}
          </>
        )}

        {(step === "pin" || step === "confirm") && (
          <>
            {photoUrl && (
              <div className="flex justify-center">
                <div className="relative">
                  <img src={photoUrl} alt="Your selfie" className="w-20 h-20 rounded-full object-cover border-2 border-brand-orange" />
                  <button onClick={() => { setStep("camera"); setPhotoUrl(""); setPin(""); setConfirmPin(""); }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-ink-800 border border-white/20 text-white/60 text-xs flex items-center justify-center hover:text-white">
                    ↺
                  </button>
                </div>
              </div>
            )}

            <div className="text-center">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-white">
                {step === "pin" ? "Choose your PIN" : "Confirm your PIN"}
              </h1>
              <p className="mt-2 text-sm text-white/60">
                {step === "pin"
                  ? "Pick a 6-digit PIN you'll use every day."
                  : "Enter the same PIN one more time."}
              </p>
            </div>

            {dots(step === "pin" ? pin : confirmPin)}

            {error && (
              <p className="text-center text-sm text-red-400">{error}</p>
            )}
            {submitting && (
              <p className="text-center text-sm text-white/50">Saving your profile…</p>
            )}

            {numPad}
          </>
        )}

      </div>
    </div>
  );
}
