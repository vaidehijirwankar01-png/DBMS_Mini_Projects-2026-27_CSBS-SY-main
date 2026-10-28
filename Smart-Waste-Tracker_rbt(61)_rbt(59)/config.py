"""
Smart Waste Collection & Segregation Tracker
Configuration Module

Loads settings from environment variables or .env file.
"""

import os
from dotenv import load_dotenv

# Load .env file if present
load_dotenv()


class Config:
    """Application configuration loaded from environment variables."""

    # Flask
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() in ('true', '1', 'yes')

    # MySQL Database
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', '3306'))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'smart_waste_db')

    # Application
    APP_PORT = int(os.getenv('APP_PORT', '5000'))

    @staticmethod
    def get_db_config():
        """Return database connection parameters as a dictionary."""
        return {
            'host': Config.DB_HOST,
            'port': Config.DB_PORT,
            'user': Config.DB_USER,
            'password': Config.DB_PASSWORD,
            'database': Config.DB_NAME,
            'autocommit': False,
            'charset': 'utf8mb4',
            'collation': 'utf8mb4_general_ci',
        }

