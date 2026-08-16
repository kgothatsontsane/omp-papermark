import { aptGet, ffmpeg } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { BuildContext } from "@trigger.dev/core/v3/build";
import { defineConfig, timeout } from "@trigger.dev/sdk/v3";

const libredwgExtension = {
  name: "libredwg",
  onBuildStart(context: BuildContext) {
    context.addLayer({
      id: "libredwg-build",
      image: {
        pkgs: [
          "ca-certificates",
          "curl",
          "gcc",
          "g++",
          "make",
          "autoconf",
          "automake",
          "libtool",
          "pkg-config",
          "libxml2-dev",
          "python3",
        ],
        instructions: [
          "RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl autoconf automake libtool pkg-config gcc g++ make libxml2-dev python3",
          "RUN curl -fsSL https://ftp.gnu.org/gnu/libredwg/libredwg-0.9.3.tar.gz -o /tmp/libredwg.tar.gz && mkdir -p /opt/libredwg && tar -xzf /tmp/libredwg.tar.gz -C /opt/libredwg --strip-components=1 && cd /opt/libredwg && ./configure --disable-bindings --disable-shared --disable-python && make -C src && make -C programs dwg2dxf && cp programs/dwg2dxf /usr/local/bin/dwg2dxf",
        ],
      },
    });
  },
};

export default defineConfig({
  project: "proj_palqkhramjxoleaduwuu",
  dirs: ["./lib/trigger"],
  maxDuration: timeout.None, // no max duration
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  build: {
    extensions: [
      aptGet({ packages: ["libreoffice"] }),
      libredwgExtension,
      prismaExtension({
        mode: "legacy",
        schema: "prisma/schema/schema.prisma",
      }),
      ffmpeg(),
    ],
  },
});
