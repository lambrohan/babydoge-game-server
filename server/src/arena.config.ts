import Arena from '@colyseus/arena';
import { monitor } from '@colyseus/monitor';
import { ApiService } from './api';
import { adminAuthMiddleware } from './api/middleware';
(BigInt as any).prototype['toJSON'] = function () {
  return this.toString();
};
const apiService = new ApiService();

/**
 * Import your Room files
 */
import { MyRoom } from './rooms/MyRoom';
export default Arena({
  getId: () => 'Your Colyseus App',
  initializeGameServer: async (gameServer) => {
    /**
     * Define your room handlers:
     */

    const rooms = await apiService.getRooms();
    console.log('ROOMS _', rooms.length);

    rooms.forEach((r) => {
      gameServer.define(r.name, MyRoom, r as any);
    });
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
    app.use(
      '/colyseus/:token',
      adminAuthMiddleware,
      monitor({
        columns: [
          'roomId',
          'name',
          'clients',
          { metadata: 'tokens' },
          'maxClients',
          'elapsedTime',
        ],
      })
    );
  },

  beforeListen: () => {
    /**
     * Before before gameServer.listen() is called.
     */
  },
});
