import { motion } from "framer-motion";
import { Zap, Database, Shield, GitBranch, Layers, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Radio,
    title: "Real-time Reactivity",
    description: "Subscribe to blockchain events and react instantly. No polling, no delays—just pure real-time data streams.",
  },
  {
    icon: Database,
    title: "Smart Contract Indexing",
    description: "Automatically index and query smart contract events with a SQL-like interface that developers love.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Sub-100ms response times powered by optimized indexing and intelligent caching strategies.",
  },
  {
    icon: Shield,
    title: "Enterprise Grade",
    description: "Built for production with 99.9% uptime, automatic failovers, and comprehensive monitoring.",
  },
  {
    icon: GitBranch,
    title: "Multi-chain Support",
    description: "Connect to Ethereum, Polygon, Polkadot, and more. One API for all your blockchain data needs.",
  },
  {
    icon: Layers,
    title: "Developer First",
    description: "Simple SDKs, extensive documentation, and powerful tooling to help you ship faster.",
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-24 px-4 md:px-6 bg-gradient-subtle">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to Build
            <span className="bg-gradient-to-r from-primary to-polkadot bg-clip-text text-transparent"> Reactive dApps</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features that make building blockchain applications a breeze
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-border/50 hover:border-primary/50 transition-all duration-500 hover:shadow-card-hover shadow-card group bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                    <feature.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};