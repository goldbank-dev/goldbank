import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { useEffect, useRef, useState } from "react";
import goldBarsHero from "@/assets/gold-bars-hero.jpg";
import goldHeroVideo from "@/assets/gold-hero-bg.mp4.asset.json";

export const Hero = () => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const markFailed = () => setVideoFailed(true);

  useEffect(() => {
    // Fallback to placeholder if video does not start within 5s
    const timeout = window.setTimeout(() => {
      if (!videoReady) setVideoFailed(true);
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [videoReady]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || videoFailed) return;
    v.play().catch(() => markFailed());
  }, [videoFailed]);

  // Validate the video asset URL and inject a <link rel="preload"> so the browser fetches it ASAP.
  useEffect(() => {
    const url = goldHeroVideo.url;
    console.info("[Hero video] asset URL", url);

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.href = url;
    link.type = "video/mp4";
    document.head.appendChild(link);

    fetch(url, { method: "HEAD" })
      .then((res) => {
        console.info("[Hero video] HEAD", {
          status: res.status,
          ok: res.ok,
          contentType: res.headers.get("content-type"),
          contentLength: res.headers.get("content-length"),
          url: res.url,
        });
        if (!res.ok) markFailed();
      })
      .catch((err) => {
        console.error("[Hero video] HEAD failed", err);
        markFailed();
      });

    return () => {
      if (link.parentNode) link.parentNode.removeChild(link);
    };
  }, []);

  return (
    <section className="relative min-h-[100svh] md:min-h-screen flex flex-col items-center justify-center pt-20 md:pt-32 pb-12 md:pb-16 overflow-hidden bg-background">
      {/* Background Media */}
      <div className="absolute inset-0 -z-20 overflow-hidden w-full h-full" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/20 md:via-background/40 to-background/90 z-10" />

        {/* Placeholder image — always rendered; visible while video is not ready or failed */}
        <img
          src={goldBarsHero}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-700 ${
            videoReady && !videoFailed ? "opacity-0" : "opacity-100"
          }`}
        />

        {!videoFailed && (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            onLoadStart={() => console.info("[Hero video] loadstart", goldHeroVideo.url)}
            onLoadedMetadata={(e) => console.info("[Hero video] loadedmetadata", { duration: e.currentTarget.duration })}
            onCanPlay={(e) => {
              console.info("[Hero video] canplay", { readyState: e.currentTarget.readyState });
              setVideoReady(true);
            }}
            onPlaying={() => {
              console.info("[Hero video] playing");
              setVideoReady(true);
            }}
            onLoadedData={(e) => {
              console.info("[Hero video] loadeddata", { readyState: e.currentTarget.readyState });
              if (e.currentTarget.readyState >= 3) setVideoReady(true);
            }}
            onError={(e) => {
              const err = e.currentTarget.error;
              console.error("[Hero video] error", {
                code: err?.code,
                message: err?.message,
                networkState: e.currentTarget.networkState,
                readyState: e.currentTarget.readyState,
                src: e.currentTarget.currentSrc,
              });
              markFailed();
            }}
            onAbort={() => {
              console.warn("[Hero video] abort");
              markFailed();
            }}
            onEmptied={() => {
              console.warn("[Hero video] emptied");
              markFailed();
            }}
            onStalled={() => {
              console.warn("[Hero video] stalled");
              window.setTimeout(() => {
                if (!videoRef.current) return;
                if (videoRef.current.readyState < 3) markFailed();
              }, 3000);
            }}
            onSuspend={() => {
              console.info("[Hero video] suspend", { readyState: videoRef.current?.readyState });
              window.setTimeout(() => {
                if (!videoRef.current) return;
                if (videoRef.current.readyState < 2) markFailed();
              }, 4000);
            }}
            onWaiting={() => console.info("[Hero video] waiting")}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-auto h-auto object-cover pointer-events-none scale-110 md:scale-100 z-0 transition-opacity duration-700 ${
              videoReady ? "opacity-100" : "opacity-0"
            }`}
          >
            <source
              src={goldHeroVideo.url}
              type="video/mp4"
              onError={(e) => {
                console.error("[Hero video] source error", { src: (e.currentTarget as HTMLSourceElement).src });
                markFailed();
              }}
            />
          </video>
        )}
      </div>

      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/30 blur-[150px] rounded-full -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="container px-4 text-center z-10 flex flex-col items-center"
      >
        {/* Big featured logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-6 md:mb-8"
        >
          <Logo size="2xl" />
        </motion.div>

        <span className="inline-block px-4 py-1.5 mb-6 text-xs md:text-sm font-medium tracking-wider text-primary border border-primary/30 rounded-full bg-primary/5 animate-pulse-gold">
          {t("hero.badge")}
        </span>

        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 max-w-5xl leading-[0.95] uppercase italic">
          {t("hero.title1")} <span className="gold-text-gradient">{t("hero.title2")}</span> {t("hero.title3")}
        </h1>

        <p className="text-base md:text-xl text-muted-foreground mb-10 max-w-2xl">
          {t("hero.description")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Button
            size="lg"
            className="w-full sm:w-auto rounded-2xl px-10 h-14 text-base md:text-lg font-bold glow-primary bg-primary text-black hover:bg-primary/90 transition-all duration-300"
            onClick={() => document.getElementById('vip')?.scrollIntoView({ behavior: 'smooth' })}
          >
            {t("hero.cta_vip")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto rounded-2xl px-10 h-14 text-base md:text-lg border-white/10 text-white hover:bg-white/5 transition-all duration-300 backdrop-blur-sm"
          >
            {t("hero.cta_explore")}
          </Button>
        </div>
      </motion.div>

      {/* Visual Element - Gold Bars */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="mt-12 md:mt-20 relative px-4 w-full flex justify-center"
      >
        <div className="w-64 h-64 md:w-96 md:h-96 rounded-full gold-gradient opacity-20 blur-3xl absolute inset-0 mx-auto" />
        <img
          src={goldBarsHero}
          alt="Barras de ouro físico de 1kg da GoldBank em custódia segura, garantindo lastro real para o ativo digital GTK"
          width={672}
          height={537}
          fetchPriority="high"
          decoding="async"
          className="relative w-full max-w-[280px] sm:max-w-md md:max-w-2xl h-auto object-cover rounded-2xl shadow-[0_0_60px_rgba(204,153,51,0.3)] border border-primary/30 animate-float"
        />
        <div className="absolute -bottom-4 right-4 md:-bottom-6 md:right-12 glass p-3 md:p-4 rounded-xl border-primary/30 animate-float [animation-delay:1.5s]">
          <p className="text-xs md:text-sm font-bold text-primary">LIVE AUDIT: ACTIVE</p>
          <p className="text-[10px] text-muted-foreground hidden sm:block">Real-time on-chain verification</p>
        </div>
      </motion.div>
    </section>
  );
};
