import { Link } from 'react-router-dom';
import { ShieldCheck, GraduationCap, User, BarChart3, Globe, FileText, Sparkles } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-bg-dark text-slate-100 bg-grid flex flex-col safe-top safe-bottom">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-2xl w-full text-center animate-slide-up px-2">
          <div className="inline-flex p-3 sm:p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-5 sm:mb-6">
            <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            AuthentiViva
          </h1>
          <p className="text-slate-400 mt-3 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            Verify learning authenticity with AI viva, confidence analytics, multilingual exams, and personalized study paths.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl mx-auto text-left"
          >
            {[
              { icon: BarChart3, label: 'Confidence Dashboard' },
              { icon: FileText, label: 'PDF Reports' },
              { icon: Sparkles, label: 'AI Recommendations' },
              { icon: Globe, label: 'Urdu · Hindi · English' }
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="glass-panel rounded-xl p-3 text-center">
                <Icon className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-[10px] text-slate-400">{label}</p>
              </div>
            ))}
          </motion.div>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full max-w-sm sm:max-w-none mx-auto">
            <Link
              to="/student/login"
              className="tap-target inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-green-600 hover:bg-white-500 text-red font-semibold border border-blue-500/40 transition-all w-full sm:w-auto"
            >
              <User className="w-5 h-5" />
              I&apos;m a Student
            </Link>
            <Link
              to="/teacher/login"
              className="tap-target inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-semibold border border-amber-500/30 transition-all w-full sm:w-auto"
            >
              <GraduationCap className="w-5 h-5" />
              I&apos;m a Teacher
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
