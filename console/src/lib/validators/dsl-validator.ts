/**
 * DSL Validator - Validates custom DSL syntax and semantics
 * Checks for syntax errors, unbalanced braces, invalid events, and rule definitions
 */

export interface DSLEvent {
  name: string;
  fields: string[];
}

export interface DSLAction {
  type: 'update' | 'delete' | 'insert' | 'notify';
  line: string;
}

export interface DSLRule {
  condition: string;
  actions: DSLAction[];
}

export interface ValidationError {
  line: number;
  message: string;
}

export interface ValidationWarning {
  line: number;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  events: DSLEvent[];
  rules: DSLRule[];
}

export class DSLValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];
  private originalCode: string = '';
  private cleanedCode: string = '';

  validate(dslCode: string): ValidationResult {
    this.errors = [];
    this.warnings = [];
    this.originalCode = dslCode;

    try {
      if (!dslCode || dslCode.trim().length === 0) {
        this.errors.push({ line: 0, message: 'DSL code cannot be empty' });
        return this.getResult(false);
      }

      if (!this.validateComments(dslCode)) {
        return this.getResult(false);
      }

      if (!this.validateBraces(dslCode)) {
        return this.getResult(false);
      }

      this.cleanedCode = this.removeComments(dslCode);

      const events = this.parseEvents(this.cleanedCode);
      if (events === null) {
        return this.getResult(false);
      }

      const rules = this.parseMainFunction(this.cleanedCode, events);
      if (rules === null) {
        return this.getResult(false);
      }

      this.validateRules(rules, events);

      return this.getResult(this.errors.length === 0, events, rules);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.errors.push({ line: 0, message: `Unexpected error: ${errorMessage}` });
      return this.getResult(false);
    }
  }

  private validateComments(code: string): boolean {
    let valid = true;
    let openCount = 0;
    let lastOpenPos = -1;
    let line = 1;

    for (let i = 0; i < code.length; i++) {
      if (code[i] === '\n') line++;

      if (code[i] === '/' && code[i + 1] === '*') {
        openCount++;
        lastOpenPos = i;
        i++;
      } else if (code[i] === '*' && code[i + 1] === '/') {
        openCount--;
        if (openCount < 0) {
          this.errors.push({
            line,
            message:
              "Unexpected closing comment '*/' without matching opening '/*'",
          });
          valid = false;
        }
        i++;
      }
    }

    if (openCount > 0) {
      this.errors.push({
        line: 0,
        message: `Unclosed comment: ${openCount} comment block(s) not closed with '*/'.`,
      });
      valid = false;
    }

    return valid;
  }

  private validateBraces(code: string): boolean {
    const withoutComments = this.removeComments(code);

    let curlyCount = 0;
    let parenCount = 0;
    let squareCount = 0;
    let line = 1;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < withoutComments.length; i++) {
      const char = withoutComments[i];

      if (char === '\n') line++;

      if ((char === '"' || char === "'") && withoutComments[i - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }

      if (inString) continue;

      if (char === '{') curlyCount++;
      if (char === '}') {
        curlyCount--;
        if (curlyCount < 0) {
          this.errors.push({
            line,
            message: "Unexpected closing brace '}'",
          });
          return false;
        }
      }

      if (char === '(') parenCount++;
      if (char === ')') {
        parenCount--;
        if (parenCount < 0) {
          this.errors.push({
            line,
            message: "Unexpected closing parenthesis ')'",
          });
          return false;
        }
      }

      if (char === '[') squareCount++;
      if (char === ']') {
        squareCount--;
        if (squareCount < 0) {
          this.errors.push({
            line,
            message: "Unexpected closing bracket ']'",
          });
          return false;
        }
      }
    }

    let valid = true;

    if (curlyCount !== 0) {
      this.errors.push({
        line: 0,
        message: `Unbalanced curly braces: ${
          curlyCount > 0
            ? curlyCount + ' unclosed'
            : Math.abs(curlyCount) + ' extra'
        }`,
      });
      valid = false;
    }

    if (parenCount !== 0) {
      this.errors.push({
        line: 0,
        message: `Unbalanced parentheses: ${
          parenCount > 0
            ? parenCount + ' unclosed'
            : Math.abs(parenCount) + ' extra'
        }`,
      });
      valid = false;
    }

    if (squareCount !== 0) {
      this.errors.push({
        line: 0,
        message: `Unbalanced brackets: ${
          squareCount > 0
            ? squareCount + ' unclosed'
            : Math.abs(squareCount) + ' extra'
        }`,
      });
      valid = false;
    }

    return valid;
  }

  private removeComments(code: string): string {
    return code.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  private parseEvents(code: string): DSLEvent[] | null {
    const eventsMatch = code.match(/const\s+events\s*=\s*\[([^\]]+)\]/s);

    if (!eventsMatch) {
      this.errors.push({
        line: 1,
        message: "Missing 'const events = [...]' definition",
      });
      return null;
    }

    const eventsContent = eventsMatch[1];
    const events: DSLEvent[] = [];
    const lines = eventsContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cleanLine = line.replace(/[,.]$/, '').trim();
      const eventMatch = cleanLine.match(/^(\w+)\s*\{\s*([^}]*)\s*\}$/);

      if (eventMatch) {
        const eventName = eventMatch[1];
        const fieldsStr = eventMatch[2].trim();
        const fields = fieldsStr
          .split(',')
          .map((f) => f.trim())
          .filter((f) => f.length > 0);

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(eventName)) {
          this.errors.push({
            line: i + 1,
            message: `Invalid event name: '${eventName}'`,
          });
          continue;
        }

        if (fields.length === 0) {
          this.errors.push({
            line: i + 1,
            message: `Event '${eventName}' has no fields`,
          });
          continue;
        }

        if (events.find((e) => e.name === eventName)) {
          this.errors.push({
            line: i + 1,
            message: `Duplicate event: '${eventName}'`,
          });
          continue;
        }

        events.push({ name: eventName, fields });
      } else if (cleanLine.length > 0) {
        this.errors.push({
          line: i + 1,
          message: `Invalid syntax: '${line}'`,
        });
      }
    }

    if (events.length === 0) {
      this.errors.push({ line: 1, message: 'No events defined' });
      return null;
    }

    return events;
  }

  private parseMainFunction(
    code: string,
    events: DSLEvent[]
  ): DSLRule[] | null {
    const fnMatch = code.match(/fn\s+main\s*\(\s*events\s*\)\s*\{([\s\S]*)\}/);

    if (!fnMatch) {
      this.errors.push({
        line: 0,
        message: "Missing 'fn main(events) { ... }'",
      });
      return null;
    }

    const functionBody = fnMatch[1];
    const rules = this.parseIfElse(functionBody, events);

    return rules;
  }

  private parseIfElse(body: string, events: DSLEvent[]): DSLRule[] {
    const rules: DSLRule[] = [];
    const ifPos = body.indexOf('if');

    if (ifPos === -1) {
      return rules;
    }

    const conditionStart = body.indexOf('(', ifPos);
    const conditionEnd = body.indexOf(')', conditionStart);
    const condition = body.substring(conditionStart + 1, conditionEnd).trim();

    const ifBlockStart = body.indexOf('{', conditionEnd);
    const ifBlockEnd = this.findMatchingBrace(body, ifBlockStart);
    const ifBlock = body.substring(ifBlockStart + 1, ifBlockEnd);

    const conditionValid = this.validateCondition(condition, events);

    if (conditionValid) {
      const ifActions = this.parseActions(ifBlock);
      rules.push({ condition, actions: ifActions });
    }

    const afterIf = body.substring(ifBlockEnd + 1).trim();
    if (afterIf.startsWith('else')) {
      const elseBlockStart = afterIf.indexOf('{');
      const elseBlockEnd = this.findMatchingBrace(afterIf, elseBlockStart);
      const elseBlock = afterIf.substring(elseBlockStart + 1, elseBlockEnd);

      const elseActions = this.parseActions(elseBlock);
      rules.push({ condition: `!(${condition})`, actions: elseActions });
    }

    return rules;
  }

  private findMatchingBrace(str: string, start: number): number {
    let depth = 0;
    for (let i = start; i < str.length; i++) {
      if (str[i] === '{') depth++;
      if (str[i] === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return str.length;
  }

  private validateCondition(condition: string, events: DSLEvent[]): boolean {
    const condMatch = condition.match(
      /events\.(\w+)\.(\w+)\s*([><=!]+)\s*(.+)/
    );

    if (!condMatch) {
      this.errors.push({
        line: 0,
        message: `Invalid condition: '${condition}'`,
      });
      return false;
    }

    const [, eventName, field] = condMatch;

    const event = events.find((e) => e.name === eventName);
    if (!event) {
      this.errors.push({
        line: 0,
        message: `Unknown event '${eventName}'`,
      });
      return false;
    }

    if (!event.fields.includes(field)) {
      this.errors.push({
        line: 0,
        message: `Unknown field '${field}' in '${eventName}'`,
      });
      return false;
    }

    return true;
  }

  private parseActions(block: string): DSLAction[] {
    const actions: DSLAction[] = [];
    const lines = block.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.startsWith('update ')) {
        actions.push({ type: 'update', line: trimmedLine });
      } else if (trimmedLine.startsWith('delete ')) {
        actions.push({ type: 'delete', line: trimmedLine });
      } else if (trimmedLine.startsWith('insert ')) {
        actions.push({ type: 'insert', line: trimmedLine });
      } else if (trimmedLine.startsWith('notify ')) {
        actions.push({ type: 'notify', line: trimmedLine });
      }
    }

    return actions;
  }

  private validateRules(rules: DSLRule[], events: DSLEvent[]): void {
    if (rules.length === 0) {
      this.warnings.push({
        line: 0,
        message: 'No rules defined',
      });
    }
  }

  getCleanedCode(): string {
    return this.cleanedCode;
  }

  private getResult(
    valid: boolean,
    events: DSLEvent[] = [],
    rules: DSLRule[] = []
  ): ValidationResult {
    return {
      valid,
      errors: this.errors,
      warnings: this.warnings,
      events,
      rules,
    };
  }
}

/**
 * Logs validation result to console with formatted output
 */
export function logValidationResult(result: ValidationResult): void {
  console.group('🔍 DSL Validation Result');

  // Status
  if (result.valid) {
    console.log('%c✓ DSL is VALID', 'color: #22c55e; font-weight: bold; font-size: 14px');
  } else {
    console.log('%c✗ DSL has ERRORS', 'color: #ef4444; font-weight: bold; font-size: 14px');
  }

  // Errors
  if (result.errors.length > 0) {
    console.group(`%c❌ Errors (${result.errors.length})`, 'color: #ef4444; font-weight: bold');
    result.errors.forEach((error) => {
      const lineInfo = error.line > 0 ? ` [Line ${error.line}]` : '';
      console.error(`${error.message}${lineInfo}`);
    });
    console.groupEnd();
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.group(`%c⚠️ Warnings (${result.warnings.length})`, 'color: #f59e0b; font-weight: bold');
    result.warnings.forEach((warning) => {
      console.warn(`${warning.message}`);
    });
    console.groupEnd();
  }

  // Events
  if (result.events.length > 0) {
    console.group(`%c📋 Events (${result.events.length})`, 'color: #8b5cf6; font-weight: bold');
    result.events.forEach((event) => {
      console.log(`${event.name}:`, event.fields.join(', '));
    });
    console.groupEnd();
  }

  // Rules
  if (result.rules.length > 0) {
    console.group(`%c⚡ Rules (${result.rules.length})`, 'color: #3b82f6; font-weight: bold');
    result.rules.forEach((rule, idx) => {
      console.log(`Rule ${idx + 1}:`, rule.condition);
      console.log(`  Actions: ${rule.actions.map((a) => a.type).join(', ')}`);
    });
    console.groupEnd();
  }

  console.groupEnd();
}
