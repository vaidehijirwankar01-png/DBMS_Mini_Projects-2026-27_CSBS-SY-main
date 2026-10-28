"""Library Management System – Flask application factory."""
import logging
import os
import secrets
from datetime import date, datetime
from decimal import Decimal
from logging.handlers import RotatingFileHandler

from flask import Flask, jsonify, render_template
from flask.json.provider import DefaultJSONProvider
from werkzeug.exceptions import HTTPException

from .config import Config


class JSONProvider(DefaultJSONProvider):
    """ISO dates (MySQL returns date objects) and plain numbers for Decimal sums."""
    @staticmethod
    def default(o):
        if isinstance(o, (date, datetime)):
            return o.isoformat(sep=" ") if isinstance(o, datetime) else o.isoformat()
        if isinstance(o, Decimal):
            return int(o) if o == o.to_integral_value() else float(o)
        return DefaultJSONProvider.default(o)


def create_app(overrides=None):
    app = Flask(__name__)
    app.json = JSONProvider(app)
    app.config.from_object(Config)
    if overrides:
        app.config.update(overrides)

    if not app.config["SECRET_KEY"]:
        app.config["SECRET_KEY"] = secrets.token_hex(32)
        app.logger.warning("SECRET_KEY not set – using a temporary key (sessions reset on restart). Set it in .env")

    _setup_logging(app)

    from .api import bp
    app.register_blueprint(bp)

    @app.get("/")
    def home():
        return render_template("index.html")

    @app.errorhandler(HTTPException)
    def http_err(e):
        return jsonify(error=e.description), e.code

    @app.errorhandler(Exception)
    def any_err(e):
        app.logger.exception("Unhandled error")
        return jsonify(error="Internal server error. Please try again or contact the administrator."), 500

    return app


def _setup_logging(app):
    if app.config.get("TESTING"):
        return
    os.makedirs(app.config["LOG_DIR"], exist_ok=True)
    fh = RotatingFileHandler(os.path.join(app.config["LOG_DIR"], "app.log"), maxBytes=1_000_000, backupCount=3, encoding="utf-8")
    fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    app.logger.addHandler(fh)
    app.logger.setLevel(logging.INFO)
