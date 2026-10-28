import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Application configuration settings."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'college-mgmt-super-secret-key-2026-csbs')
    
    # MySQL Database Connection Settings
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
    MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'college_management')
    MYSQL_USER = os.getenv('MYSQL_USER', 'college_app_user')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '987654321')
    
    # Connection Pool Settings
    MYSQL_POOL_NAME = 'college_pool'
    MYSQL_POOL_SIZE = 5
