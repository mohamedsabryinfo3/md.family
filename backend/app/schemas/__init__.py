"""MD.Family Backend — Pydantic schemas (request/response models)."""

from .auth import (
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    GoogleLoginRequest,
    RefreshRequest,
)
from .family import FamilyCreate, FamilyResponse, MotherPermissionsUpdate
from .child import ChildCreate, ChildUpdate, ChildResponse
from .device import DeviceResponse, PairingCodeCreate, PairingConsume
from .pairing import PairingSessionResponse
from .policy import AppPolicyCreate, AppPolicyUpdate, AppPolicyResponse
from .routine import RoutineCreate, RoutineResponse
from .web_filter import WebCategoryResponse, WebCategoryUpdate, WebsiteExceptionCreate, WebsiteExceptionResponse
from .location import LocationSampleCreate, LocationSampleResponse, SafeZoneCreate, SafeZoneResponse
from .alert import SafetyAlertResponse, AlertReview
from .school import SchoolCreate, SchoolResponse
from .contact import ContactCreate, ContactResponse
from .backup import BackupResponse
from .audit import AuditLogResponse
from .common import PaginatedResponse, MessageResponse, ErrorResponse
from .live_session import LiveSessionCreate, LiveSessionResponse

__all__ = [
    "TokenResponse", "UserCreate", "UserLogin", "UserResponse",
    "GoogleLoginRequest", "RefreshRequest",
    "FamilyCreate", "FamilyResponse", "MotherPermissionsUpdate",
    "ChildCreate", "ChildUpdate", "ChildResponse",
    "DeviceResponse", "PairingCodeCreate", "PairingConsume",
    "PairingSessionResponse",
    "AppPolicyCreate", "AppPolicyUpdate", "AppPolicyResponse",
    "RoutineCreate", "RoutineResponse",
    "WebCategoryUpdate", "WebsiteExceptionCreate", "WebsiteExceptionResponse",
    "LocationSampleCreate", "LocationSampleResponse", "SafeZoneCreate", "SafeZoneResponse",
    "SafetyAlertResponse", "AlertReview",
    "SchoolCreate", "SchoolResponse",
    "ContactCreate", "ContactResponse",
    "BackupResponse", "AuditLogResponse",
    "PaginatedResponse", "MessageResponse", "ErrorResponse",
    "LiveSessionCreate", "LiveSessionResponse",
]
