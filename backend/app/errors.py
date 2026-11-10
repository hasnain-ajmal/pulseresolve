import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("pulseresolve")


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, headers: dict | None = None):
        self.status, self.code, self.message, self.headers = status, code, message, headers or {}


_CODES = {401: "unauthorized", 403: "forbidden", 404: "not_found", 405: "method_not_allowed", 429: "rate_limited"}


def install_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api(_: Request, e: ApiError):
        return JSONResponse({"code": e.code, "message": e.message}, status_code=e.status, headers=e.headers)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, e: StarletteHTTPException):
        return JSONResponse({"code": _CODES.get(e.status_code, "error"), "message": "Request could not be completed."}, status_code=e.status_code)

    @app.exception_handler(RequestValidationError)
    async def _val(_: Request, e: RequestValidationError):
        first = e.errors()[0] if e.errors() else {}
        loc = ".".join(str(x) for x in first.get("loc", []) if x != "body")
        msg = f"Invalid input{(': ' + loc) if loc else ''}."
        return JSONResponse({"code": "validation_error", "message": msg}, status_code=422)

    @app.exception_handler(OverflowError)
    async def _overflow(_: Request, e: OverflowError):
        return JSONResponse({"code": "validation_error", "message": "Invalid input: number out of range."}, status_code=422)

    @app.exception_handler(Exception)
    async def _any(_: Request, e: Exception):
        log.exception("Unhandled error")
        return JSONResponse({"code": "server_error", "message": "Something went wrong."}, status_code=500)
