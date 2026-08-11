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
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-110'
                    : done
                      ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200'
                }`}
              >
                {done ? '✓' : n}
              </div>
              {n < total && (
                <div
                  className={`mx-1 h-px w-8 transition-colors duration-300 sm:w-12 ${
                    step > n ? 'bg-emerald-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-center text-[13px] text-gray-500">
        Étape {step} sur {total}
        <span className="text-gray-300"> · </span>
        <span className="font-medium text-gray-700">{STEP_LABELS[step - 1]}</span>
      </p>
    </div>
  )
}
