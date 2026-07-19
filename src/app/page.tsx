import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      {/* Premium Pure White Container */}
      <div className="w-full max-w-md bg-white border border-black/5 rounded-[2rem] p-10 shadow-sm text-center">
        <span className="text-xs font-medium tracking-widest uppercase text-black/40">
          Proofly - A PrimeLabs Project
        </span>
        
        <h1 className="text-4xl font-bold tracking-tight text-[#1D1D1F] mt-3 mb-4">
          Proofly
        </h1>
        
        <p className="text-sm text-black/60 leading-relaxed mb-8">
          Automate customer video reviews and display them as an exit-intent trust widget on your store.
        </p>

        {/* Minimal Apple-Style Link Component */}
        <Link 
          href="/dashboard" 
          className="block w-full bg-[#1D1D1F] text-white text-sm font-medium py-3 px-6 rounded-full hover:opacity-90 transition-opacity"
        >
          Launch Dashboard
        </Link>
      </div>
    </main>
  );
}
