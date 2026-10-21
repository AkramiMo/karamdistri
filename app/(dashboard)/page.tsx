'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="flex-1 flex items-center justify-center w-full h-full">
      <div className="text-center">
        {/* Logo avec animation */}
        <div
          className={`transition-all duration-1000 ease-out ${
            mounted
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 translate-y-4'
          }`}
        >
          <div className="animate-bounce-slow">
            <Image
              src="/Logo.png"
              alt="KARAM Olives & Sauces"
              width={450}
              height={450}
              className="mx-auto"
              priority
            />
          </div>
        </div>

        {/* Texte avec animation décalée */}
        <p
          className={`mt-8 text-2xl text-[#B8860B] font-bold transition-all duration-700 delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Bienvenue sur KARAM ERP
        </p>
        <p
          className={`mt-3 text-gray-500 transition-all duration-700 delay-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Sélectionnez un module dans la barre de consultation
        </p>
      </div>
    </div>
  )
}
