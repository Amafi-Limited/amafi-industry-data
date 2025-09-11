import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
      let msg = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(metadata).length > 0) {
        try {
          // Handle circular references by using a replacer function
          const seen = new WeakSet();
          const safeMetadata = JSON.stringify(metadata, (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) {
                return '[Circular Reference]';
              }
              seen.add(value);
            }
            // Skip large objects like request/response objects
            if (key === 'req' || key === 'res' || key === 'socket' || key === '_req' || key === '_res') {
              return '[Object]';
            }
            return value;
          });
          msg += ` ${safeMetadata}`;
        } catch (error) {
          // Fallback if stringify still fails
          msg += ` [Metadata stringify error: ${error instanceof Error ? error.message : String(error)}]`;
        }
      }
      return msg;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'error.log', 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: 'combined.log' 
  }));
}