import logging
import sys
import json
from app.core.config import settings

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)

def setup_logging():
    logger = logging.getLogger() # root logger
    logger.setLevel(settings.LOG_LEVEL)

    # Remove existing handlers to avoid duplicates
    if logger.handlers:
        for handler in logger.handlers:
            logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    
    if settings.ENVIRONMENT == "production":
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    # Specific loggers can be configured here
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger.setLevel(settings.LOG_LEVEL)
    # Ensure uvicorn access log uses same handler/formatter logic if needed,
    # but uvicorn handles its own usually. We configure root which captures most app logs.
