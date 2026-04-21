FROM python:3.11-bookworm AS runtime

ARG PIP_INDEX_URL=https://pypi.org/simple
ARG PIP_TRUSTED_HOSTS="pypi.org files.pythonhosted.org"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DEFAULT_TIMEOUT=120 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore \
    PIP_INDEX_URL=$PIP_INDEX_URL \
    PIP_TRUSTED_HOST=$PIP_TRUSTED_HOSTS

WORKDIR /app

RUN apt-get -o Acquire::Retries=5 update \
    && apt-get install -y --no-install-recommends \
      build-essential \
      ca-certificates \
      curl \
      libgl1 \
      libglib2.0-0 \
      libmagic1 \
      poppler-utils \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN python -m pip install \
    --retries 5 \
    --timeout 120 \
    --prefer-binary \
    -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
