FROM mcr.microsoft.com/devcontainers/java:1-21-bookworm

ENV ANDROID_SDK_ROOT=/usr/local/android-sdk \
    ANDROID_HOME=/usr/local/android-sdk \
    PATH=/usr/local/android-sdk/cmdline-tools/latest/bin:/usr/local/android-sdk/platform-tools:${PATH}

ARG ANDROID_CMDLINE_TOOLS_VERSION=14742923

RUN apt-get update \
    && apt-get install -y --no-install-recommends wget unzip zip \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p "${ANDROID_SDK_ROOT}/cmdline-tools" \
    && wget -q "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS_VERSION}_latest.zip" -O /tmp/android-cmdline-tools.zip \
    && unzip -q /tmp/android-cmdline-tools.zip -d "${ANDROID_SDK_ROOT}/cmdline-tools" \
    && mv "${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools" "${ANDROID_SDK_ROOT}/cmdline-tools/latest" \
    && yes | sdkmanager --licenses \
    && sdkmanager \
        "platform-tools" \
        "platforms;android-36" \
        "build-tools;36.1.0" \
    && rm -f /tmp/android-cmdline-tools.zip
