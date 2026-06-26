'use client'

const STEP_LABELS = ['Compte', 'École', 'Sections']

type AuthStepperProps = {
  step: number
  total?: number
}

export function AuthStepper({ step, total = 3 }: AuthStepperProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-0">
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1
          const done = step > n
          const active = step === n
          return (
            <div key={n} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  active
                    ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-110'
                    : done
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                      : 'bg-white/[0.05] text-zinc-600 ring-1 ring-white/[0.08]'
                }`}
              >
                {done ? '✓' : n}
              </div>
              {n < total && (
                <div
                  className={`mx-1 h-px w-8 transition-colors duration-300 sm:w-12 ${
                    step > n ? 'bg-emerald-500/50' : 'bg-white/[0.08]'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-center text-[13px] text-zinc-500">
        Étape {step} sur {total}
        <span className="text-zinc-600"> · </span>
        <span className="text-zinc-400">{STEP_LABELS[step - 1]}</span>
      </p>
    </div>
  )
}
