import Link from 'next/link'
import { Swords, Target, Trophy, Skull, Users, Zap } from 'lucide-react'

export default function LandingPage() {
  const features = [
    { icon: Target, title: 'Set Real Stakes', desc: 'Your challenger decides the consequence — embarrassing post or a painful dare. No escape.' },
    { icon: Trophy, title: 'Win with Pride', desc: 'Submit proof, get it verified, and bask in glory while your consequence disappears.' },
    { icon: Skull, title: 'Fail Publicly', desc: 'Miss the deadline or get your proof rejected? The consequence goes public — to all your friends.' },
    { icon: Zap, title: 'Real-time Pressure', desc: 'Live countdown timers keep the heat on. Your friends watch every check-in.' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center">
              <Swords className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">Dared</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
              Login
            </Link>
            <Link href="/auth/signup" className="btn-primary py-2 px-4 text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-32 px-4 text-center">
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-sm text-brand-400 font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            Accountability with consequences
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 leading-none">
            Challenge friends.
            <br />
            <span className="gradient-text">Fail publicly.</span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
            Set goals with real stakes. Your friends set the consequence — and if you fail,
            everyone finds out.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="btn-primary text-base py-4 px-8 inline-flex items-center justify-center gap-2">
              <Swords className="w-5 h-5" />
              Start challenging
            </Link>
            <Link href="/auth/login" className="btn-secondary text-base py-4 px-8 inline-flex items-center justify-center">
              I already have an account
            </Link>
          </div>
        </div>

        {/* Mock challenge card */}
        <div className="relative max-w-sm mx-auto mt-20">
          <div className="card p-5 text-left shadow-2xl shadow-brand-900/20 border-brand-800/30">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">You challenged <span className="text-white font-semibold">@jake</span></p>
                <p className="font-semibold text-white">Run a 5K under 30 minutes</p>
              </div>
              <span className="badge text-green-400 bg-green-400/10 border-green-400/20">Active</span>
            </div>
            <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-xl mb-3 flex gap-2 items-start">
              <Skull className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">Consequence: Post your most embarrassing photo from high school as your profile pic for a week</p>
            </div>
            <div className="flex gap-2">
              {['02', '14', '33', '07'].map((v, i) => (
                <div key={i} className="flex-1 bg-gray-800/50 rounded-lg py-1.5 text-center">
                  <div className="text-lg font-mono font-bold text-brand-400">{v}</div>
                  <div className="text-[10px] text-gray-600">{['Days','Hrs','Min','Sec'][i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 border-t border-gray-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">How it works</h2>
          <p className="text-gray-400 text-center mb-14">Simple, brutal, effective.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6">
                <div className="w-10 h-10 bg-brand-600/20 border border-brand-600/30 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 text-center border-t border-gray-800">
        <div className="max-w-xl mx-auto">
          <Users className="w-12 h-12 text-brand-400 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-4">Ready to be held accountable?</h2>
          <p className="text-gray-400 mb-8">Your friends are waiting to set your consequences.</p>
          <Link href="/auth/signup" className="btn-primary text-base py-4 px-10 inline-flex items-center justify-center">
            Create your account
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} Dared. Challenge responsibly.
      </footer>
    </div>
  )
}
