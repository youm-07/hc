// Enhanced Error Logging System for Harvi Creates
class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
    this.enableConsole = true;
    this.enableStorage = true;
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Add to memory
    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Console logging
    if (this.enableConsole) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, data || '');
    }

    // Local storage logging
    if (this.enableStorage) {
      try {
        const storedLogs = JSON.parse(localStorage.getItem('hc_logs') || '[]');
        storedLogs.unshift(logEntry);
        if (storedLogs.length > this.maxLogs) {
          storedLogs.pop();
        }
        localStorage.setItem('hc_logs', JSON.stringify(storedLogs.slice(0, 50)));
      } catch (e) {
        console.error('Failed to store log:', e);
      }
    }

    // Send critical errors to server (if available)
    if (level === 'error' && window.supabaseService) {
      this.sendErrorToServer(logEntry);
    }
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  async sendErrorToServer(logEntry) {
    try {
      // Only send if user is logged in to avoid spam
      if (window.supabaseService && window.supabaseService.isLoggedIn()) {
        const { data, error } = await window.supabaseService.supabase
          .from('error_logs')
          .insert([{
            timestamp: logEntry.timestamp,
            level: logEntry.level,
            message: logEntry.message,
            data: logEntry.data,
            url: logEntry.url,
            user_agent: logEntry.userAgent
          }]);
        
        if (error) {
          console.warn('Failed to send error to server:', error);
        }
      }
    } catch (e) {
      console.warn('Error logging service unavailable:', e);
    }
  }

  getLogs(level = null) {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('hc_logs');
  }

  exportLogs() {
    const logs = this.getLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harvi-creates-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Global error handlers
window.addEventListener('error', (event) => {
  window.logger?.error('JavaScript Error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  window.logger?.error('Unhandled Promise Rejection', {
    reason: event.reason,
    stack: event.reason?.stack
  });
});

// Initialize global logger
window.logger = new Logger();
window.logger.info('Logger initialized successfully');
