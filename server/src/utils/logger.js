/**
 * Centralized logging utility with log levels
 * Provides consistent formatting and control over log output
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

class Logger {
    constructor() {
        // Default to INFO in production, DEBUG in development
        const defaultLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
        this.level = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? defaultLevel;
    }

    _shouldLog(level) {
        return level >= this.level;
    }

    _format(level, context, message, ...args) {
        const timestamp = new Date().toISOString();
        const prefix = context ? `[${context}]` : '';
        return `${timestamp} [${level}] ${prefix} ${message}`;
    }

    debug(context, message, ...args) {
        if (this._shouldLog(LOG_LEVELS.DEBUG)) {
            console.log(this._format('DEBUG', context, message), ...args);
        }
    }

    info(context, message, ...args) {
        if (this._shouldLog(LOG_LEVELS.INFO)) {
            console.log(this._format('INFO', context, message), ...args);
        }
    }

    warn(context, message, ...args) {
        if (this._shouldLog(LOG_LEVELS.WARN)) {
            console.warn(this._format('WARN', context, message), ...args);
        }
    }

    error(context, message, ...args) {
        if (this._shouldLog(LOG_LEVELS.ERROR)) {
            console.error(this._format('ERROR', context, message), ...args);
        }
    }
}

module.exports = new Logger();
