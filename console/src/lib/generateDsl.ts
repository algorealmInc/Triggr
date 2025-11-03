export interface ContractEvent {
  label: string;
  args: string[];
}
export function generateDSL(contract_events: ContractEvent[]) {
  // Convert event list to DSL-like event declarations
  const eventsDSL = contract_events
    .map((event) => {
      // Extract arg names only (before ":")
      const argNames = event.args.map((a) => a.split(":")[0].trim());
      const argsJoined = argNames.join(", ");
      return `${event.label} { ${argsJoined} }`;
    })
    .join(",\n        ");

  // Assemble full DSL code
  const dsl = `
/* Events defined in your contract */
  const events = [
    ${eventsDSL}
]

fn main(events) {
/* Write trigger logic here */

}`;
  return dsl.trim();
}
