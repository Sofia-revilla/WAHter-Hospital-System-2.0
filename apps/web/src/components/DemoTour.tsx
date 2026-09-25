"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { TAB_EMOJI, TAB_FEATURES, type DemoStep } from "@/demoTour";

interface DemoTourProps {
  isOpen: boolean;
  steps: DemoStep[];
  currentStep: number;
  // App moves both demoStep and activeTab, so the page behind follows the tour
  onStepChange: (step: number) => void;
  onClose: () => void;
}

export function DemoTour({
  isOpen,
  steps,
  currentStep,
  onStepChange,
  onClose,
}: DemoTourProps) {
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      {isOpen && step && (
        <>
          {/* backdrop: clicking outside the card closes the tour */}
          <motion.div
            key="demo-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[290] bg-black/40 backdrop-blur-sm"
          />

          {/* the key changes every step so the card re-plays its entrance each time */}
          <motion.div
            key={`demo-modal-${currentStep}`}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            // pointer-events-none on the full-screen wrapper so clicks around the
            // card still reach the backdrop underneath
            className={cn(
              "pointer-events-none fixed inset-0 z-[300]",
              "flex items-center justify-center p-4",
            )}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="demo-tour-title"
              className={cn(
                "pointer-events-auto w-full max-w-md overflow-hidden",
                "rounded-xl bg-white shadow-2xl",
              )}
            >
              <div
                className={cn(
                  "flex items-start justify-between gap-4 px-6 py-4",
                  "bg-gradient-to-r from-amber-400 to-amber-500",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-4xl" aria-hidden>
                    {TAB_EMOJI[step.tab]}
                  </span>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">
                      WAHter Demo · Step {currentStep + 1} of {steps.length}
                    </p>
                    <h2 id="demo-tour-title" className="text-xl font-black leading-tight text-white">
                      {step.title}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[10px] font-black uppercase text-white/60 hover:text-white"
                >
                  ✕ Exit
                </button>
              </div>

              <div className="flex gap-1.5 px-6 pt-4">
                {steps.map((tourStep, index) => (
                  <button
                    key={tourStep.tab}
                    type="button"
                    onClick={() => onStepChange(index)}
                    aria-label={`Go to step ${index + 1}: ${tourStep.title}`}
                    aria-current={index === currentStep ? "step" : undefined}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      index === currentStep
                        ? "w-6 bg-amber-400"
                        : "w-1.5 bg-slate-200 hover:bg-amber-200",
                    )}
                  />
                ))}
              </div>

              <p className="px-6 pb-3 pt-4 text-sm leading-relaxed text-slate-600">{step.desc}</p>

              <div className="px-6 pb-4">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                  What you can do here
                </p>
                <div className="flex flex-wrap gap-2">
                  {TAB_FEATURES[step.tab].map((feature) => (
                    <span
                      key={feature}
                      className={cn(
                        "rounded-full border border-amber-200 bg-amber-50 px-3 py-1",
                        "text-[11px] font-semibold text-amber-700",
                      )}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className={cn(
                  "flex items-center justify-between",
                  "border-t border-slate-100 px-6 pb-5 pt-4",
                )}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    "text-slate-400 hover:text-slate-600",
                  )}
                >
                  Skip Tour
                </button>

                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <button
                      type="button"
                      onClick={() => onStepChange(currentStep - 1)}
                      className={cn(
                        "rounded-xl border-2 border-amber-200 px-4 py-2.5",
                        "text-xs font-black uppercase text-amber-600 hover:border-amber-400",
                      )}
                    >
                      ← Back
                    </button>
                  )}
                  {isLastStep ? (
                    <button
                      type="button"
                      onClick={onClose}
                      className={cn(
                        "rounded-xl bg-wah-purple px-5 py-2.5 text-xs font-black uppercase text-white",
                        "shadow-lg shadow-wah-purple/20 hover:bg-wah-purple/90",
                      )}
                    >
                      Finish Tour ✓
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStepChange(currentStep + 1)}
                      className={cn(
                        "rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-black uppercase text-white",
                        "shadow-lg shadow-amber-200 hover:bg-amber-500",
                      )}
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
