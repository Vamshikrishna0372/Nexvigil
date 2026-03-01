from app.api.v1.endpoints import (
    health, auth, test_routes, cameras, internal, alerts, notifications, system, analytics, models, organizations, media, ai_admin, anomalies, rules, users
)
from fastapi import APIRouter

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(test_routes.router, tags=["Test"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["Cameras"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(rules.router, prefix="/rules", tags=["Rules"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(media.router, prefix="/media", tags=["Media"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(system.router, prefix="/system", tags=["System"])
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["Anomalies"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(models.router, prefix="/models", tags=["Models"])
api_router.include_router(ai_admin.router, prefix="/ai", tags=["AI Admin"])
api_router.include_router(internal.router, prefix="/internal", tags=["Internal"])
