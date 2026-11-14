# OmniCura Zcash notary: zingo-cli + the notary sidecar in one container.
# Build context is the repo root; notary/Dockerfile.dockerignore limits it to the sidecar script.

# ---- Build zingo-cli + nym-proxy ----
FROM rust:1-bookworm AS build
# Tolerate flaky networks during the (large) dependency download.
ENV CARGO_NET_RETRY=10 \
    CARGO_HTTP_TIMEOUT=120 \
    CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential gcc libsqlite3-dev pkg-config protobuf-compiler git ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN cargo install cargo-make --locked
ARG ZINGOLIB_REF=dev
RUN git clone --depth 1 --branch ${ZINGOLIB_REF} https://github.com/zingolabs/zingolib.git /src
WORKDIR /src
# Default features: current zingo-cli only goes online through the Nym mixnet, so
# nym-proxy must be built and shipped beside it (a --nakednet build is offline-only).
RUN makers run-cli --build-only && ./target/release/zingo-cli --version && ls -la target/release/nym-proxy

# ---- Runtime: Node + zingo-cli ----
FROM node:22-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends libsqlite3-0 ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=build /src/target/release/zingo-cli /usr/local/bin/zingo-cli
COPY --from=build /src/target/release/nym-proxy /usr/local/bin/nym-proxy
RUN zingo-cli --version
WORKDIR /app
COPY scripts/zcash-notary-sidecar.mjs scripts/zcash-notary-sidecar.mjs
ENV ZINGO_CLI_PATH=/usr/local/bin/zingo-cli \
    ZINGO_NYM_PROXY=/usr/local/bin/nym-proxy \
    ZINGO_DATA_DIR=/data \
    ZCASH_NOTARY_SIDECAR_HOST=0.0.0.0
VOLUME /data
EXPOSE 8737
CMD ["node", "scripts/zcash-notary-sidecar.mjs"]
