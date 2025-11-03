import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export const CtaSection = () => {
  return (
    <section className="py-24 px-4 md:px-6 relative overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 bg-gradient-mesh" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-r from-primary/30 to-polkadot/30 blur-[150px] rounded-full animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full" />
      
      <div className="container mx-auto max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-8 p-12 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md shadow-elevated hover:shadow-card-hover transition-all duration-500"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Start Building Today</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold">
            Ready to Build the Future
            <br />
            <span className="bg-gradient-to-r from-primary to-polkadot bg-clip-text text-transparent">
              of Web3?
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of developers building reactive, real-time blockchain applications with Triggr.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="text-lg px-8 py-6 bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow group relative overflow-hidden">
              <span className="relative z-10">Get Started for Free</span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 hover:bg-primary/5 transition-colors">
              Schedule a Demo
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
};