'use strict';
import {Daemon} from './Daemon';
import {DefaultEnvironment, EnvironmentUtil} from 'pandora-env';
import {DAEMON_READY, PANDORA_GLOBAL_CONFIG} from '../const';
import {MetricsConstants} from 'pandora-metrics';
import {GlobalConfigProcessor} from '../universal/GlobalConfigProcessor';
import {getDaemonLogger, getPandoraLogsDir} from '../universal/LoggerBroker';
import {MetricsInjectionBridge as MetricsDaemonUtil} from 'pandora-metrics';

/**
 * Class DaemonBootstrap
 */
export class DaemonBootstrap {

  private daemonLogger = getDaemonLogger();
  private globalConfigProcessor = GlobalConfigProcessor.getInstance();
  private globalConfig = this.globalConfigProcessor.getAllProperties();
  private daemon: Daemon;

  /**
   * Start the daemon
   * @return {Promise<void>}
   */
  start(): Promise<void> {

    const Environment = this.globalConfig.environment || DefaultEnvironment;

    // Register a default env for daemon process
    const daemonEnvironment = new Environment({
      processName: 'daemon',
      appName: MetricsConstants.METRICS_DEFAULT_APP,
      pandoraLogsDir: getPandoraLogsDir()
    });
    daemonEnvironment.set(PANDORA_GLOBAL_CONFIG, this.globalConfig);
    EnvironmentUtil.getInstance().setCurrentEnvironment(daemonEnvironment);

    this.daemon = new Daemon();

    // Start daemon
    return this.daemon.start().then(() => {
      // Set daemon to metrics
      MetricsDaemonUtil.setDaemon(<any> this.daemon);
      if (process.send) {
        process.send(DAEMON_READY);
      }
    }).catch(err => {
      this.daemonLogger.error(err);
      throw err;
    });
  }

  /**
   * Stop the Daemon
   * @return {Promise<void>}
   */
  stop(): Promise<void> {
    return this.daemon.stop();
  }

}

export function cmd(): Promise<void> {
  const daemonBootstrap = new DaemonBootstrap;
  return daemonBootstrap.start().catch(() => {
    process.exit(1);
  });
}

if (require.main === module) {
  cmd();
}

