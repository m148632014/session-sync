const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

class Logger {
  constructor(prefix = 'session-sync') {
    this.prefix = prefix;
  }

  info(message) {
    console.log(`${COLORS.cyan}ℹ${COLORS.reset} ${message}`);
  }

  success(message) {
    console.log(`${COLORS.green}✓${COLORS.reset} ${message}`);
  }

  warn(message) {
    console.warn(`${COLORS.yellow}⚠${COLORS.reset} ${message}`);
  }

  error(message) {
    console.error(`${COLORS.red}✕${COLORS.reset} ${message}`);
  }

  debug(message) {
    if (process.env.DEBUG) {
      console.log(`${COLORS.gray}[DEBUG]${COLORS.reset} ${message}`);
    }
  }

  title(message) {
    console.log(`\n${COLORS.bright}${COLORS.blue}${message}${COLORS.reset}`);
  }

  section(message) {
    console.log(`\n${COLORS.bright}${message}${COLORS.reset}`);
  }

  list(items) {
    for (const item of items) {
      console.log(`  ${COLORS.dim}•${COLORS.reset} ${item}`);
    }
  }
}

export default new Logger('session-sync');
