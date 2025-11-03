import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

export const CodeExampleSection = () => {
  const codeExample = `// Subscribe to contract events in real-time
import { triggr } from '@triggr/sdk';

const stream = triggr
  .from('ethereum')
  .contract('0x...')
  .on('Transfer', (event) => {
    console.log(\`New transfer: \${event.amount}\`);
    // React instantly to blockchain events
  });

// Query historical data with SQL-like syntax
const transfers = await triggr
  .query('ethereum')
  .select('*')
  .from('Transfer')
  .where('amount > 1000')
  .orderBy('timestamp', 'desc')
  .limit(100);`;

  return (
    <section className="py-24 px-4 md:px-6 bg-background">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid lg:grid-cols-2 gap-12 items-center"
        >
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Simple API,
              <br />
              <span className="bg-gradient-to-r from-primary to-polkadot bg-clip-text text-transparent">
                Powerful Results
              </span>
            </h2>
            <p className="text-xl text-muted-foreground mb-6">
              Write clean, maintainable code that reacts to blockchain events in real-time. 
              No complex infrastructure, no boilerplate—just pure developer productivity.
            </p>
            <ul className="space-y-4">
              {[
                "Type-safe SDK with full IntelliSense support",
                "Real-time subscriptions with automatic reconnection",
                "SQL-like queries for complex data retrieval",
                "Built-in caching and optimization",
              ].map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-polkadot" />
                  <span className="text-muted-foreground">{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Card className="p-8 bg-card/80 backdrop-blur-sm border-border/50 shadow-elevated hover:shadow-card-hover transition-all duration-500 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <pre className="text-sm overflow-x-auto relative z-10">
                <code className="text-muted-foreground font-mono leading-relaxed">
                  {codeExample}
                </code>
              </pre>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};