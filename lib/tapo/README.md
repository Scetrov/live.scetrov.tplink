# Vendored Tapo client

This directory contains the runtime JavaScript from
[`tp-link-tapo-connect` 2.0.15](https://github.com/dickydoouk/tp-link-tapo-connect/tree/1d3bcd52ac2c67c9ecd5a874646fe086d70b9225),
licensed under the ISC license in `LICENSE`.

It is vendored because the published package has no release with secure versions
of its transitive dependencies. Test files, source maps, declarations, discovery,
and the vulnerable `local-devices` fallback are intentionally excluded. MAC-to-IP
resolution continues to use the package's ARP lookup implementation.
