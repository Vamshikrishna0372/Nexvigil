from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import time
import logging

logger = logging.getLogger("api.access")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Process the request
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            logger.info(
                f"Method: {request.method} Path: {request.url.path} "
                f"Status: {response.status_code} "
                f"Duration: {process_time:.4f}s"
            )
            return response
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"Method: {request.method} Path: {request.url.path} "
                f"Status: 500 "
                f"Duration: {process_time:.4f}s "
                f"Error: {str(e)}"
            )
            raise e
