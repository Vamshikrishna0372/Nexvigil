import { Link } from "react-router-dom";
import { Shield, Camera, Bell, BarChart3, ChevronRight, Eye, Zap, Lock, Monitor, Globe, Server, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  { icon: Eye, title: "Detection Engine", desc: "YOLOv8-powered real-time object detection with 95%+ accuracy across multiple categories." },
  { icon: Camera, title: "Smart Recording", desc: "Event-based recording captures only what matters — saving storage and reducing noise." },
  { icon: Bell, title: "Alert System", desc: "Instant email notifications with screenshots and confidence scores on every detection." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Deep insights into detection trends, camera performance, and peak activity hours." },
];

const stats = [
  { label: "Cameras Supported", value: "500+" },
  { label: "Detection Accuracy", value: "94.7%" },
  { label: "Avg Response Time", value: "< 2s" },
  { label: "Uptime SLA", value: "99.9%" },
];

const techStack = [
  { icon: Cpu, label: "YOLOv8 Engine" },
  { icon: Server, label: "Edge Processing" },
  { icon: Globe, label: "Cloud Sync" },
  { icon: Monitor, label: "Real-Time Dashboard" },
];

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }) };

const Landing = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">Nexvigil</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <Link to="/register"><Button size="sm">Get Started</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/90 to-background" />
        </div>
        {/* Animated grid overlay */}
        <div className="absolute inset-0 z-[1] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(hsl(175 70% 45%) 1px, transparent 1px), linear-gradient(90deg, hsl(175 70% 45%) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 container mx-auto px-6 py-32 md:py-48 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-8">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Surveillance</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
            Real-Time AI{" "}
            <span className="text-gradient">Surveillance</span>{" "}
            Intelligence
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Event-based smart detection, automated alerts, and intelligent monitoring.
            Nexvigil transforms passive cameras into an active security network.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="gap-2 px-8 text-base font-semibold glow-primary">
                Request Demo <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="gap-2 px-8 text-base">
                <Lock className="w-4 h-4" /> Login
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div key={s.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center">
                <p className="text-3xl md:text-4xl font-extrabold text-gradient">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Intelligent Security Stack</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Every component designed for mission-critical surveillance operations.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="glass-panel rounded-xl p-6 group hover:border-primary/40 transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tech stack strip */}
      <section className="container mx-auto px-6 pb-24">
        <div className="glass-panel rounded-2xl p-8 md:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {techStack.map((t, i) => (
              <motion.div key={t.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="flex flex-col items-center gap-3 p-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <t.icon className="w-7 h-7 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">{t.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 pb-24">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-panel rounded-2xl p-12 text-center glow-primary relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, hsl(175 70% 45%), transparent 70%)' }} />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Ready to upgrade your surveillance?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Deploy Nexvigil in minutes. Connect your cameras, configure rules, and let AI handle the rest.</p>
            <Link to="/register"><Button size="lg" className="px-10 font-semibold">Get Started Free</Button></Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Nexvigil</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Nexvigil. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
