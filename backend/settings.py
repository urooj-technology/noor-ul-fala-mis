import os
from pathlib import Path
from decouple import config
from datetime import timedelta
import pymysql
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework.authtoken",
    # build-in application
    "corsheaders",
    "rest_framework",
    "django_filters",
    'knox',
    # my application
    "api.apps.ApiConfig",
    "account",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "api.middleware.activity_logger.ActivityLoggerMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            os.path.join(BASE_DIR, 'api', 'templates'),
            os.path.join(BASE_DIR, 'static', 'frontend'),
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DB_ENGINE = config('DB_ENGINE', default='sqlite3')
DB_ENGINE_MAP = {
    'sqlite3': 'django.db.backends.sqlite3',
    'mysql': 'django.db.backends.mysql',
    'postgresql': 'django.db.backends.postgresql',
}

if DB_ENGINE == 'mysql':
    pymysql.install_as_MySQLdb()
    DATABASES = {
        "default": {
            "ENGINE": DB_ENGINE_MAP[DB_ENGINE],
            "NAME": config('DB_NAME'),
            "USER": config('DB_USER'),
            "PASSWORD": config('DB_PASSWORD'),
            "HOST": config('DB_HOST'),
            "PORT": config('DB_PORT'),
            "CONN_MAX_AGE": config("DB_CONN_MAX_AGE", default=60, cast=int),
            "OPTIONS": {
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
                "charset": "utf8mb4",
                "use_unicode": True,
                "sql_mode": "traditional",
                "connect_timeout": config("DB_CONNECT_TIMEOUT", default=60, cast=int),
            }
        }
    }
    ATOMIC_REQUESTS = True
elif DB_ENGINE == 'postgresql':
    DATABASES = {
        "default": {
            "ENGINE": DB_ENGINE_MAP[DB_ENGINE],
            "NAME": config('DB_NAME'),
            "USER": config('DB_USER'),
            "PASSWORD": config('DB_PASSWORD'),
            "HOST": config('DB_HOST'),
            "PORT": config('DB_PORT', default='5432'),
            "CONN_MAX_AGE": config("DB_CONN_MAX_AGE", default=60, cast=int),
        }
    }
    ATOMIC_REQUESTS = True
else:
    DATABASES = {
        "default": {
            "ENGINE": DB_ENGINE_MAP[DB_ENGINE],
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }



# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = config("STATIC_URL")
STATIC_ROOT = config("STATIC_ROOT")

MEDIA_URL = config("MEDIA_URL")
MEDIA_ROOT = config("MEDIA_ROOT")

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "account.User"


# CORS
APPEND_SLASH = False
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


# REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("knox.auth.TokenAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": config('API_PAGE_SIZE', default=12, cast=int),
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "EXCEPTION_HANDLER": "api.utils.custom_exception_handler",
}



# Email Configuration
EMAIL_BACKEND = config('EMAIL_BACKEND')
EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT', cast=int)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default=EMAIL_HOST_USER)
EMAIL_TIMEOUT = config('EMAIL_TIMEOUT', default=30, cast=int)

# Add Knox settings
REST_KNOX = {
    'TOKEN_TTL': timedelta(days=config('TOKEN_EXPIRY_DAYS', default=7, cast=int)),
    'TOKEN_LIMIT_PER_USER': config('TOKEN_LIMIT', default=0, cast=int),
    'AUTO_REFRESH': True,
}

# File Upload Settings
MAX_UPLOAD_SIZE = config("MAX_UPLOAD_SIZE", cast=int)
ALLOWED_UPLOAD_EXTENSIONS = config("ALLOWED_UPLOAD_EXTENSIONS").split(",")

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

CSRF_TRUSTED_ORIGINS = ['http://localhost:8000', 'http://127.0.0.1:8000']

# Cache Settings
CACHES = {
    'default': {
        'BACKEND': config('CACHE_BACKEND', default='django.core.cache.backends.locmem.LocMemCache'),
        'LOCATION': config('CACHE_LOCATION', default='unique-snowflake'),
    }
}

# site address
SITE_ADDRESS = config("SITE_ADDRESS")

# Security Settings (Production)
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'
