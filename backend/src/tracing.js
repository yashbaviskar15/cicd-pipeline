'use strict';

const config = require('./config');

/**
 * OpenTelemetry tracing bootstrap. Must be required as the very first import
 * in the process entrypoint so instrumentation can patch modules before they
 * are loaded.
 *
 * Tracing is opt-in (OTEL_ENABLED=true) to keep local development and CI
 * lightweight and free-tier friendly.
 */
let sdk = null;

if (config.otel.enabled) {
  // Lazy-require so the heavier OTel SDK modules are only loaded when enabled.
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
  const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
  const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
  const { Resource } = require('@opentelemetry/resources');

  sdk = new NodeSDK({
    resource: new Resource({
      'service.name': config.otel.serviceName,
      'service.version': config.serviceVersion,
      'deployment.environment': config.env
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${config.otel.endpoint}/v1/traces`
    }),
    instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()]
  });

  sdk.start();
}

module.exports = {
  enabled: config.otel.enabled,
  async shutdown() {
    if (sdk) {
      await sdk.shutdown();
    }
  }
};
