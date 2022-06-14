import Arena from '@colyseus/arena';
import { monitor } from '@colyseus/monitor';
import { RedisPresence } from 'colyseus';

/**
 * Import your Room files
 */
import { MyRoom } from './rooms/MyRoom';
const isProd = false;
export default Arena({
  getId: () => 'Your Colyseus App',

  options: isProd
    ? {
        presence: new RedisPresence({
          host: process.env.REDIS_HOST || 'localhost',
          port: (process.env.REDIS_PORT as any) || 6379,
          password: process.env.REDIS_PASSWORD || '',
        }),
        // driver: new MongooseDriver(MONGOOSE_CONFIG()),  uncomment this if you want to use mongodb instead of redis
      }
    : {},
  initializeGameServer: (gameServer) => {
    /**
     * Define your room handlers:
     */
    gameServer.define('my_room', MyRoom);
    if (isProd) {
      // gameServer.simulateLatency(200);
    }
  },

  initializeExpress: (app) => {
    /**
     * Bind your custom express routes here:
     */
    app.get('/', (req, res) => {
      res.send("It's time to kick ass and chew bubblegum!");
    });

    /**
     * Bind @colyseus/monitor
     * It is recommended to protect this route with a password.
     * Read more: https://docs.colyseus.io/tools/monitor/
     */
    app.use('/colyseus', monitor());
  },

  beforeListen: () => {
    /**
     * Before before gameServer.listen() is called.
     */
  },
});
